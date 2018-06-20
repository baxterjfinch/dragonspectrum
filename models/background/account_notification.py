import logging
from datetime import datetime
from datetime import timedelta

from google.appengine.api import runtime
from google.appengine.api import background_thread

from models.payment import payment
from server import mail
from server import GlobalConfig
from models.account import User


log = logging.getLogger(__file__)


def run():
    gc = GlobalConfig.get_configs()
    users = User.query()

    for user in users.iter():
        log.info('Check ' + user.username + ' account status')

        if runtime.is_shutting_down():
            break

        if user.account_status == payment.TRIAL or user.account_status == payment.TRIAL_EXPIRED:
            expire_date = user.account_expire_date + timedelta(days=gc.trial_expiring_grace_period)
            days_till_expire = (expire_date - datetime.now()).days
            log.info(user.username + ' account expires in ' + str(days_till_expire))

            if days_till_expire in gc.trial_expiring_email_intervales:
                log.info(user.username + '\'s trial expires in ' + str(days_till_expire) + ' days')
                mail.send_trial_ending_email(days_till_expire, user, gc)
            elif days_till_expire == 0:
                log.info(user.username + '\'s trial has expired')
                user.account_statue = payment.TRIAL_EXPIRED
                user.put()
                mail.send_trial_ended_email(user, gc)
            elif days_till_expire * -1 in gc.trial_expired_email_intervales:
                user.account_statue = payment.TRIAL_EXPIRED
                user.put()
                mail.send_after_trial_ended_email(days_till_expire * -1, user, gc)

        elif user.account_status != payment.ORG and user.account_status != payment.SUB:
            expire_date = user.account_expire_date + timedelta(days=gc.acct_expiring_grace_period)
            days_till_expire = (expire_date - datetime.now()).days
            log.info(user.username + ' account expires in ' + str(days_till_expire))

            if days_till_expire in gc.acct_expiring_email_intervales and user.account_status != payment.SUB:
                log.info(user.username + '\'s account expires in ' + str(days_till_expire) + ' days')
                mail.send_account_expiring_email(days_till_expire, user, gc)
            elif days_till_expire == 0:
                log.info(user.username + '\'s account has expired')
                user.account_statue = payment.EXPIRED
                user.put()
                mail.send_account_expired_email(user, gc)
            elif days_till_expire * -1 in gc.acct_expired_email_intervales:
                user.account_statue = payment.EXPIRED
                user.put()
                mail.send_after_account_expired_email(days_till_expire * -1, user, gc)

        else:
            log.info('Nothing to check')

    if runtime.is_shutting_down():
        log.warning('Had to stop notifing users, backend receaved shut donw request')


def start_account_notification():
    t = background_thread.BackgroundThread(target=run)
    t.start()
