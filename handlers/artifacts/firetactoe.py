# Copyright 2016 Google Inc. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Tic Tac Toe with the Firebase API"""

import json
import re
import urllib


import flask
import webapp2
from google.appengine.ext import ndb


import requests
import requests_toolbelt.adapters.appengine

# Use the App Engine Requests adapter. This makes sure that Requests uses
# URLFetch.
requests_toolbelt.adapters.appengine.monkeypatch()


import firebase_admin
from firebase_admin import db
from firebase_admin import auth
from firebase_admin import credentials

from server import create_uuid
from server.httperrorexception import HttpErrorException
from server.handlers import AuthorizationRequestHanlder, JINJA_ENVIRONMENT

cred = credentials.Certificate("firebase-serviceAccountKey.json")
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://firetactoe-2fc95.firebaseio.com'
})


_X_WIN_PATTERNS = [
    'XXX......', '...XXX...', '......XXX', 'X..X..X..', '.X..X..X.',
    '..X..X..X', 'X...X...X', '..X.X.X..']
_O_WIN_PATTERNS = map(lambda s: s.replace('X', 'O'), _X_WIN_PATTERNS)

X_WINS = map(lambda s: re.compile(s), _X_WIN_PATTERNS)
O_WINS = map(lambda s: re.compile(s), _O_WIN_PATTERNS)


def _send_firebase_message(u_id, message=None):
    """Updates data in firebase. If a message is provided, then it updates
     the data at /channels/<channel_id> with the message using the PATCH
     http method. If no message is provided, then the data at this location
     is deleted using the DELETE http method
     """
    root = db.reference(path='channels')
    if message:
        new_user = root.child(u_id).push(message)


def create_custom_token(uid, valid_minutes=60):
    """Create a secure token for the given id.

    This method is used to create secure custom JWT tokens to be passed to
    clients. It takes a unique id (uid) that will be used by Firebase's
    security rules to prevent unauthorized access. In this case, the uid will
    be the channel id which is a combination of user_id and game_key
    """
    custom_token = auth.create_custom_token(uid)
    return custom_token


class Game(ndb.Model):
    """All the data we store for a game"""
    userX = ndb.KeyProperty()
    userO = ndb.KeyProperty()
    board = ndb.StringProperty()
    moveX = ndb.BooleanProperty()
    winner = ndb.StringProperty()
    winning_board = ndb.StringProperty()

    def to_json(self):
        d = self.to_dict()
        d['winningBoard'] = d.pop('winning_board')
        return json.dumps(d, default=lambda user: user.id())

    def send_update(self):
        """Updates Firebase's copy of the board."""
        message = self.to_json()

        # send updated game state to user X
        _send_firebase_message(self.userX.id() + self.key.id(), message=message)

        # send updated game state to user O
        if self.userO is not None:
            _send_firebase_message(self.userO.id() + self.key.id(), message=message)

    def _check_win(self):
        if self.moveX:
            # O just moved, check for O wins
            wins = O_WINS
            potential_winner = self.userO.id()
        else:
            # X just moved, check for X wins
            wins = X_WINS
            potential_winner = self.userX.id()

        for win in wins:
            if win.match(self.board):
                self.winner = potential_winner
                self.winning_board = win.pattern
                return

        # In case of a draw, everyone loses.
        if ' ' not in self.board:
            self.winner = 'Noone'

    def make_move(self, position, user):
        # If the user is a player, and it's their move
        userX = self.userX.get()
        userO = self.userO.get()

        if (user.key.id() in (userX.key.id(), userO.key.id())) and \
                (self.moveX == (user.key.id() == userX.key.id())):
            boardList = list(self.board)
            # If the spot you want to move to is blank
            if (boardList[position] == ' '):
                boardList[position] = 'X' if self.moveX else 'O'
                self.board = ''.join(boardList)
                self.moveX = not self.moveX
                self._check_win()
                self.put()
                self.send_update()
                return


class FBTestMove(AuthorizationRequestHanlder):
    def post(self):
        game = Game.get_by_id(self.request.get('g'))
        position = int(self.request.get('i'))
        if not (game and (0 <= position <= 8)):
            raise HttpErrorException.bad_request('failed')
        game.make_move(position, self.user)
        self.write_json_response({})


class FBTestDelete(AuthorizationRequestHanlder):
    def post(self):
        game = Game.get_by_id(self.request.get('g'))
        if not game:
            raise HttpErrorException.bad_request('failed')
        _send_firebase_message(self.user.key.id() + game.key.id(), message=None)
        self.write_json_response({})


class FBTestOpened(AuthorizationRequestHanlder):
    def post(self):
        game = Game.get_by_id(self.request.get('g'))
        if not game:
            raise HttpErrorException.bad_request('failed')
        game.send_update()
        self.write_json_response({})


class FBTestMainPage(AuthorizationRequestHanlder):
    def get(self):
        """Renders the main page. When this page is shown, we create a new
        channel to push asynchronous updates to the client."""
        game_key = self.request.get('g')

        if not game_key:
            game_key = create_uuid()
            game = Game(id=game_key, userX=self.user.key, moveX=True, board=' '*9)
            game.put()
        else:
            game = Game.get_by_id(game_key)
            if not game:
                raise HttpErrorException.bad_request('failed')
            if not game.userO and game.userX != self.user.key:
                game.userO = self.user.key
                game.put()

        # [START pass_token]
        # choose a unique identifier for channel_id
        channel_id = self.user.key.id() + game_key
        # encrypt the channel_id and send it as a custom token to the
        # client
        # Firebase's data security rules will be able to decrypt the
        # token and prevent unauthorized access
        client_auth_token = create_custom_token(channel_id)
        _send_firebase_message(channel_id, message=game.to_json())

        # game_link is a url that you can open in another browser to play
        # against this player
        game_link = 'https://oval-sunset-207817.appspot.com/fb?g={}'.format(game_key)

        # push all the data to the html template so the client will
        # have access
        template_values = {
            'is_user_x': True if self.user.key == game.userX else False,
            'is_user_o': True if self.user.key == game.userO else False,
            'token': client_auth_token,
            'channel_id': channel_id,
            'me': self.user.key.id(),
            'game_key': game_key,
            'game_link': game_link,
            'initial_message': urllib.unquote(game.to_json())
        }

        template_index = JINJA_ENVIRONMENT.get_template('fire_index.html')
        self.response.write(template_index.render(template_values))
