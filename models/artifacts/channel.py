import json
import server
import random
from datetime import datetime, timedelta
from artifact import Artifact
from google.appengine.ext import ndb
from google.appengine.api import channel
from colour.colour import make_color_factory, HSL_equivalence, RGB_color_picker


class ChannelToken(Artifact):
    token = ndb.StringProperty()
    user = ndb.KeyProperty()
    color = ndb.StringProperty()
    concept = ndb.KeyProperty()
    link_id = ndb.StringProperty()
    document = ndb.KeyProperty()
    connected = ndb.BooleanProperty(default=False)  # Tell if the client ever connected
                                                    # not if they are connected

    @property
    def client_id(self):
        return self.key.id()

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
    def get_by_project_key(key, request_user_token=None):
        channel_tokens = ChannelToken.query(ChannelToken.project == key).fetch()

        cut_off_time1 = datetime.now() - timedelta(hours=2, minutes=15)
        cut_off_time2 = datetime.now() - timedelta(minutes=3)

        valid_tokens = []
        invalid_tokens = []
        for channel_token in channel_tokens:
            # Remove expired tokens
            if request_user_token and request_user_token.client_id == channel_token.client_id:
                continue
            elif channel_token.created_ts < cut_off_time1:
                invalid_tokens.append(channel_token.key)
            # Remove token that were never used older than 3 minutes
            elif not channel_token.connected and channel_token.created_ts < cut_off_time2:
                invalid_tokens.append(channel_token.key)
            else:
                valid_tokens.append(channel_token)
        ndb.delete_multi(invalid_tokens)
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
            channel.send_message(channel_token.client_id, message)