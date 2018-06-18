#!/usr/bin/env python

import logging.handlers
import getpass
import requests
import time
import sys

SMPT_SERVER = 'smtp.gmail.com'
SMTP_PORT = 587
SMTP_USERNAME = 'andrew.miller@createtank.com'
SMTP_PASSWORD = None
SMTP_FROM_ADDRESS = 'andrew.miller@createtank.com'
SMTP_TO_ADDRESS = 'andrew.miller@createtank.com'
SMTP_SUBJECT = 'Site Monitor: thinktank-gae-amiller'
LOGGING_FILENAME = 'site_monitor.log'
THINKTANK_SERVER_URL = 'http://thinktank-gae-amiller.appspot.com/monitor/server/'
SERVER_SECRET = '296e477ba0f4b3b7d099c7ea60d35f2b5dd9905cf03421223dc06b8fce8c2c96'

FAILED_CONNECT_TIMEOUT = 3
FAILED_CONNECT_RETRIES = 3


class BufferingSMTPHandler(logging.handlers.SMTPHandler):
    """
    BufferingSMTPHandler works like SMTPHandler log handler except that it
    buffers log messages until buffer size reaches or exceeds the specified
    capacity at which point it will then send everything that was buffered up
    until that point in one email message.  Contrast this with SMTPHandler
    which sends one email per log message received.
    """

    def __init__(self, mailhost, fromaddr, toaddrs, subject, credentials=None,
                 secure=None, capacity=1024, min_level=logging.DEBUG):
        logging.handlers.SMTPHandler.__init__(self, mailhost, fromaddr,
                                              toaddrs, subject,
                                              credentials, secure)

        self.capacity = capacity
        self.buffer = []
        self.min_level = min_level
        self.send_logs = False

    def emit(self, record):
        try:
            if record.levelno >= self.min_level:
                self.send_logs = True
            self.buffer.append(record)

            if len(self.buffer) >= self.capacity:
                self.flush()
        except (KeyboardInterrupt, SystemExit):
            raise
        except:
            self.handleError(record)

    def flush(self):
        # buffer on termination may be empty if capacity is an exact multiple of
        # lines that were logged--thus we need to check for empty buffer
        if not self.buffer:
            return

        if not self.send_logs:
            return

        try:
            import smtplib
            from email.utils import formatdate

            port = self.mailport
            if not port:
                port = smtplib.SMTP_PORT
            smtp = smtplib.SMTP(self.mailhost, port)
            msg = ""
            for record in self.buffer:
                msg = msg + self.format(record) + "\r\n"
            msg = "From: %s\r\nTo: %s\r\nSubject: %s\r\nDate: %s\r\n\r\n%s" % (
                self.fromaddr,
                ",".join(self.toaddrs),
                self.getSubject(self.buffer[0]),
                formatdate(), msg)
            if self.username:
                if self.secure is not None:
                    smtp.ehlo()
                    smtp.starttls()
                    smtp.ehlo()
                smtp.login(self.username, self.password)
            smtp.sendmail(self.fromaddr, self.toaddrs, msg)
            smtp.quit()
            self.buffer = []
        except (KeyboardInterrupt, SystemExit):
            raise
        except:
            self.handleError(self.buffer[0])


def failed(msg):
    log.critical(msg)
    log.debug('Shutting down')
    sys.exit(0)


if __name__ == "__main__":
    log = logging.getLogger(__file__)
    log.setLevel(logging.DEBUG)
    filehandler = logging.handlers.RotatingFileHandler(LOGGING_FILENAME, maxBytes=1024*1024, backupCount=20)
    filehandler.setLevel(logging.DEBUG)
    logformat = logging.Formatter("[%(asctime)s] %(levelname)8s: %(message)s", "%Y-%m-%d %H:%M:%S")
    filehandler.setFormatter(logformat)
    log.addHandler(filehandler)
    smtphandler = BufferingSMTPHandler((SMPT_SERVER, SMTP_PORT), SMTP_FROM_ADDRESS, SMTP_TO_ADDRESS, SMTP_SUBJECT,
                                      (SMTP_USERNAME, SMTP_PASSWORD if SMTP_PASSWORD else getpass.getpass()),
                                       True, 1000000, logging.WARNING)
    smtphandler.setLevel(logging.INFO)
    smtphandler.setFormatter(logformat)
    log.addHandler(smtphandler)

    # Now we start the main guts
    log.debug('Starting up')
    log.info('Attemping to contact: ' + str(THINKTANK_SERVER_URL))
    start_time = time.time()
    for i in range(0, FAILED_CONNECT_RETRIES):
        r = requests.get(THINKTANK_SERVER_URL + SERVER_SECRET)
        if r.status_code != 200:
            log.critical('Could not reach the server')
            log.info('Will attempt to contact server again %d in  seconds', FAILED_CONNECT_TIMEOUT)
            time.sleep(FAILED_CONNECT_TIMEOUT)
            log.info('Attemping to contact server again')
        else:
            break
    else:
        failed('Failed to contact the server!!!')
    json_response = r.json()
    if 'test' not in json_response:
        failed('The returned json did not have "test" key: %s'.format(str(json_response)))
    if json_response['test'] != 'successful':
        failed('The server did not return a successful response: %s'.format(str(json_response)))
    log.info('Datastore read time: %.20f', json_response['datastore_read_time'])
    log.debug('Finished')

