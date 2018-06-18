"""
Copyright 2013 cr3473

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
"""


from hashlib import md5, sha512
import logging
import json
import os
import datetime
import time

from google.appengine.ext import ndb
from google.appengine.api import datastore_errors


log = logging.getLogger('tt')


class Timestamp(object):
    as_datetime = None
    as_ms = None
    
    def __init__(self, val):
        if type(val) in (datetime.datetime, datetime.date):
            if type(val) is datetime.date: 
                val = datetime.datetime(val.year, val.month, val.day)
            
            self.as_datetime = val
            self.as_ms = self._to_ms(val)
        else:
            if val is None:
                val = 0
            self.as_datetime = self._to_datetime(val)
            self.as_ms = val
            
    def _to_ms(self, dt):
        if dt == datetime.datetime.max:
            epoch_st = time.gmtime(0)
            epoch_dt = datetime.datetime(epoch_st.tm_year, epoch_st.tm_mon, epoch_st.tm_mday, epoch_st.tm_hour, epoch_st.tm_min, epoch_st.tm_sec)
            delta = datetime.datetime.max - epoch_dt
            ms = delta.days * (24*60*60*1000) + delta.seconds * 1000 + delta.microseconds / 1000
            return ms
        
        ms = time.mktime(dt.utctimetuple()) * 1000
        ms += getattr(dt, 'microseconds', 0) / 1000
        return long(ms)
    
    def _to_datetime(self, ms):
        s = float(ms) / 1000
        return datetime.datetime.utcfromtimestamp(s)
    
    def __str__(self):
        return str(self.as_datetime)
            

class Password(object):
    """Custom password implementation which uses salted SHA512 hashing to prevent rainbow table dictionary attacks.
    
    >>> p = Password('fishes')
    >>> str(p)
    '8328f0a833db0e9d-f3b89be00699b33a8d5bb08577d34f159365121b578aa3871a5bba10c838d067717986d0ac14d04656b9f6d23430a09075b703e61f05047e8d5e05aafabff090'
    >>> p == 'rosebud'
    False
    >>> p == 'fishes'
    True
    """
    SALT_LENGTH = 16
    
    def __init__(self, password=None, salt=None, password_hash=None):
        """
        `Password('fishes')` - create a new hashed password
        `Password(password_hash='23756283746', salt='98237983')` - instantiate an existing hashed password
        """
        self.salt = salt if salt else None
        if password_hash:
            self.password_hash = password_hash
        elif password:
            if not self.salt:
                self.salt = Password._generate_salt()
            self.password_hash = Password._hash_password(password, self.salt)
        else:
            raise Exception('Password requires either password, password+salt, or password_hash')
    
    @staticmethod
    def _generate_salt():
        return md5(os.urandom(Password.SALT_LENGTH)).hexdigest()[:Password.SALT_LENGTH]
    
    @staticmethod
    def _hash_password(password, salt):
        return sha512(salt + password).hexdigest()
    
    @staticmethod
    def from_str(password_str):
        """Reinstantiate an existing Password from its hashed string representation"""
        if not password_str or password_str == 'None':  # WTF?! GAE hands back u'None' for null values??
            return None
        try:
            salt, password_hash = password_str.split('-')
        except ValueError, e:
            log.warning(e)
            return None
        return Password(salt=salt, password_hash=password_hash)
    
    def __eq__(self, other):
        """Support equality comparison with un-hashed password string"""
        if type(other) in (str, unicode):
            return Password(password=other, salt=self.salt).password_hash == self.password_hash
        elif isinstance(other, Password):
            return self.password_hash == other.password_hash and self.salt == other.salt
        else:
            return NotImplemented
        
    def __ne__(self, other):
        result = self.__eq__(other)
        return not result if result is not NotImplemented else NotImplemented
    
    def __str__(self):
        """Represent a Password as String in form 'SALT-HASHEDPASSWORD'"""
        return '%s-%s' % (self.salt, self.password_hash)


class ReferenceProperty(ndb.KeyProperty):
    def _validate(self, value):
        if not isinstance(value, ndb.Model):
            raise TypeError('expected an ndb.Model, got %s' % repr(value))

    def _to_base_type(self, value):
        return value.key

    def _from_base_type(self, value):
        return value.get()


class PasswordProperty(ndb.StringProperty):
    """Custom GAE property for storing password"""
    
    data_type = Password
    
    def _to_base_type(self, value):
        return str(value)
    
    def _from_base_type(self, value):
        if value is None:
            return None
        
        return Password.from_str(value)
    
    def _validate(self, value):
        if value and type(value) not in (Password, str, unicode):
            raise ndb.BadValueError('Property %s must be able to be converted to a Password (%s)' % (self.name, value))


class JsonProperty(ndb.TextProperty):

    def _to_base_type(self, value):
        return json.dumps(value)
    
    def _from_base_type(self, value):
        if value is None:
            return None
        return json.loads(value)
    
    def _validate(self, value):
        if value is not None and not isinstance(value, (dict, list, tuple)):
            raise ndb.BadValueError('JsonProperty values must be able to be converted into JSON (dict, list... not %s)' % (type(value).__name__))
        
        if not value and self.required:
            raise ndb.BadValueError('Property %s is required' % self.name)
            
        return value


class CoercedFloatProperty(ndb.FloatProperty):
    """FloatProperty that gracefully validates any number value that can be coerced into a float()"""
    def _validate(self, val):
        val = super(CoercedFloatProperty, self).validate(val)
        if val is None:
            return val
        try:
            return float(val)
        except (TypeError, ValueError):
            raise datastore_errors.BadValueError('Property %s must be a float' % self.name)


class HookedModel(ndb.Model):
    """
    Model base class which gives before and after hooks on the put() method and provides
    a delete() method which also has before and after hooks. DOES NOT WORK WITH ASYNC METHODS (YET)!
    """
    
    def before_put(self):
        pass
    
    def after_put(self):
        pass
    
    def put(self, **kwargs):
        self.before_put()
        super(HookedModel, self).put(**kwargs)
        self.after_put()

    def before_delete(self):
        pass

    def after_delete(self):
        pass

    def delete(self, **ctx_options):
        self.before_delete()
        self.key.delete(**ctx_options)
        self.after_delete()


class JsonMixIn(object):
    _SIMPLE_TYPES = (int, long, float, bool, dict, basestring, list)
    
    def _set_dict_value(self, output, key, prop=None):
        value = getattr(self, key)
        
        
        if prop and prop.required is False and not value:
            pass
        elif value is None or isinstance(value, self._SIMPLE_TYPES):
            output[key] = value
        elif isinstance(value, datetime.date):
            output[key] = Timestamp(value).as_ms
        elif isinstance(value, ndb.Model):
            output[key] = value.key().id_or_name()
        else:
            raise ValueError('cannot encode %s: %s' % (key, repr(prop)))
        
    def to_dict(self):
        output = {}
        
        for key, prop in self.properties().iteritems():
            self._set_dict_value(output, key, prop)
        
        if hasattr(self, 'dynamic_properties'):
            for key in self.dynamic_properties():
                self._set_dict_value(output, key)
        
        if 'id' not in output:
            output['id'] = self.key().id_or_name()

        if hasattr(self, '__optional_fields__'):
            for fieldname in self.__optional_fields__:
                if fieldname in output and not output[fieldname]:
                    del output[fieldname]
                    
        return output
    
    def to_json(self):
        return json.dumps(self.to_dict())
    
    @classmethod
    def from_dict(cls, d, **kwargs):
        
        for k, v in d.items():
            if cls.properties().has_key(k) and isinstance(cls.properties()[k], ndb.DateTimeProperty) and not isinstance(v, datetime.datetime):
                d[k] = Timestamp(v).as_datetime
            
            if cls.properties().has_key(k) and isinstance(cls.properties()[k], ndb.GeoPtProperty):
                d[k] = '%s,%s' % (d[k]['lat'], d[k]['lon'])
                
        d.update(kwargs)
        
        return cls(**d)


class JsonBaseModel(ndb.Model, JsonMixIn):
    pass


class SessionizedModel(ndb.Model):
    def after_put(self):
        from auth import Session
        Session.invalidate_cache_for(self)


class User(HookedModel):
    """
    Base model class for a single user in the system.
    """
    username = ndb.StringProperty(required=True)
    password = PasswordProperty()
    access_token = ndb.StringProperty()
    access_secret = ndb.StringProperty() 
    last_login = ndb.DateTimeProperty()
    date_joined = ndb.DateProperty()
