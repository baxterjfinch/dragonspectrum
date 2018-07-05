import json
import server
import random
from datetime import datetime, timedelta
from artifact import Artifact

from firebase_admin import db
from google.appengine.ext import ndb
from colour.colour import make_color_factory, HSL_equivalence, RGB_color_picker


class ChannelToken(Artifact):
    user = ndb.KeyProperty()
    color = ndb.StringProperty()
    concept = ndb.KeyProperty()
    link_id = ndb.StringProperty()
    document = ndb.KeyProperty()
    connected = ndb.BooleanProperty(default=False)

    def send_message(self, message):
        return ChannelToken.broadcast_message([self], message)

    def set_status(self, value):
        status = db.reference(path='collaboration/' + self.user.id() + '/' + self.id + '/status')
        status.set(True)

    def check_connection_status(self):
        status = db.reference(path='collaboration/' + self.user.id() + '/' + self.id + '/status')
        return status.get()

    @staticmethod
    def generate_color():
        get_color = make_color_factory(equality=HSL_equivalence, picker=RGB_color_picker, pick_key=str)
        r = lambda: random.randint(server.config.channel_user_red_start_color,
                                   server.config.channel_user_red_end_color)
        g = lambda: random.randint(server.config.channel_user_green_start_color,
                                   server.config.channel_user_green_end_color)
        b = lambda: random.randint(server.config.channel_user_blue_start_color,
                                   server.config.channel_user_blue_end_color)
        return str(get_color('#%02X%02X%02X' % (r(), g(), b()),
                             luminance=server.config.channel_user_luminance_adjustment).hex_l)

    @staticmethod
    def _delete_user_old_channels(user):
        deleted_channels = []
        if user is not None:
            user_channels = db.reference(path='collaboration/' + user.user.id()).get()
            for channel_id in user_channels:
                channel = db.reference(path='collaboration/' + user.user.id() + '/' + channel_id)
                if not channel.get().get('status', False):
                    channel.delete()
                    deleted_channels.append(channel_id)
        return deleted_channels

    @staticmethod
    def get_by_project_key(pro_key, request_user_token=None):
        deleted_channels = ChannelToken._delete_user_old_channels(request_user_token)
        channel_tokens = ChannelToken.query(ChannelToken.project == pro_key).fetch()

        cut_off_time1 = datetime.now() - timedelta(hours=2, minutes=15)
        cut_off_time2 = datetime.now() - timedelta(minutes=3)

        valid_tokens = []
        invalid_token = []
        invalid_token_keys = []
        for channel_token in channel_tokens:
            if request_user_token and request_user_token.id == channel_token.id:
                continue

            # Remove expired tokens
            elif channel_token.id in deleted_channels:
                invalid_token.append(channel_token)
                invalid_token_keys.append(channel_token.key)

            elif channel_token.created_ts < cut_off_time1:
                invalid_token.append(channel_token)
                invalid_token_keys.append(channel_token.key)

            elif not channel_token.check_connection_status() and channel_token.created_ts < cut_off_time2:
                invalid_token.append(channel_token)
                invalid_token_keys.append(channel_token.key)

            else:
                valid_tokens.append(channel_token)

        deleted_channels = set(deleted_channels)
        for channel_token in invalid_token:
            deleted_channels.add(channel_token.id)

        vt = valid_tokens
        if request_user_token is not None:
            vt = vt + [request_user_token]
        for cid in deleted_channels:
            ChannelToken.broadcast_message(vt, {'channel_op': 'remove_user', 'user': cid})

        ndb.delete_multi(invalid_token_keys)

        return valid_tokens

    @staticmethod
    def remove_unauthorized_users(channel_tokens, artifacts):
        if type(channel_tokens) is not list:
            channel_tokens = [channel_tokens]
        if type(artifacts) is not list:
            artifacts = [artifacts]

        auth_channel_tokens = []
        for artifact in artifacts:
            for channel_token in channel_tokens:
                if artifact is None:
                    auth_channel_tokens.append(channel_token)
                elif artifact.has_permission_read(channel_token.user.get()):
                    if channel_token not in auth_channel_tokens:
                        auth_channel_tokens.append(channel_token)
        return auth_channel_tokens

    @staticmethod
    def broadcast_message(channel_tokens, message):
        if not isinstance(message, basestring):
            message = json.dumps(message)

        for channel_token in channel_tokens:
            root = db.reference(path='collaboration/' + channel_token.user.id())
            root.child(channel_token.id).push(message)
