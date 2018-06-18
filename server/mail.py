import os
import logging
import smtplib
import server
from email.mime.text import MIMEText
from jinja2 import Environment
from server import tt_logging

log = logging.getLogger('tt')


def send_email(to_adrs, msg, gc):
    if os.environ.get('SERVER_SOFTWARE', '').startswith('Development'):
        log.warning('This is the development server: Can not send emails')
        log.info('Email message:\n' + msg.as_string())
        return
    if not isinstance(to_adrs, list):
        to_adrs = [to_adrs]
    svr = smtplib.SMTP(gc.smtp_server_address + ':' + gc.smtp_server_port)
    svr.starttls()
    svr.login(gc.smtp_username, gc.smtp_password)
    for to in to_adrs:
        svr.sendmail(gc.smtp_username, to, msg.as_string())
    svr.quit()


def send_email_verification(user, gc):
    env = Environment()
    verification_link = (server.server_url + '/account/verify/email/' +
                         user.email_verification.verify_id + '?username=' + user.username)
    temp_var = {
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'verification_link': verification_link,
    }
    email_temp = env.from_string(source=gc.email_verification_template)
    msg = MIMEText(email_temp.render(temp_var), 'html')
    msg['Subject'] = gc.email_verification_template_subject
    msg['From'] = gc.smtp_username
    msg['To'] = user.email
    send_email(user.email, msg, gc)
    log.info('Sent email verification to user: %s', user.email, extra={'user': user})


def send_username(user, gc):
    env = Environment()
    temp_var = {
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
    }
    email_temp = env.from_string(source=gc.username_template)
    msg = MIMEText(email_temp.render(temp_var), 'html')
    msg['Subject'] = gc.username_template_subject
    msg['From'] = gc.smtp_username
    msg['To'] = user.email
    send_email(user.email, msg, gc)
    log.info('Sent username to user: %s', user.email, extra={'user': user})


def send_password_reset(user, gc):
    env = Environment()
    user.password_reset_secret = server.create_uuid()
    user.put()
    reset_url = (server.server_url + '/account/password/reset/' + user.password_reset_secret)
    temp_var = {
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'reset_url': reset_url,
    }
    email_temp = env.from_string(source=gc.reset_password_template)
    msg = MIMEText(email_temp.render(temp_var), 'html')
    msg['Subject'] = gc.reset_password_template_subject
    msg['From'] = gc.smtp_username
    msg['To'] = user.email
    send_email(user.email, msg, gc)
    log.info('Sent password resest email to user: %s', user.email, extra={'user': user})


def send_trial_ending_email(days_left, user, gc):
    env = Environment()
    temp_var = {
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'days': days_left,
    }
    email_temp = env.from_string(source=gc.trial_ending_template)
    msg = MIMEText(email_temp.render(temp_var), 'html')
    msg['Subject'] = gc.trial_ending_template_subject
    msg['From'] = gc.smtp_username
    msg['To'] = user.email
    send_email(user.email, msg, gc)
    log.info('Sent trail ending email to user: %s', user.email, extra={'user': user})


def send_trial_ended_email(user, gc):
    env = Environment()
    temp_var = {
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
    }
    email_temp = env.from_string(source=gc.trial_ended_template)
    msg = MIMEText(email_temp.render(temp_var), 'html')
    msg['Subject'] = gc.trial_ended_template_subject
    msg['From'] = gc.smtp_username
    msg['To'] = user.email
    send_email(user.email, msg, gc)
    log.info('Sent trail ended email to user: %s', user.email, extra={'user': user})


def send_after_trial_ended_email(days, user, gc):
    env = Environment()
    temp_var = {
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'days': days,
    }
    email_temp = env.from_string(source=gc.after_trial_ended_template)
    msg = MIMEText(email_temp.render(temp_var), 'html')
    msg['Subject'] = gc.after_trial_ended_template_subject
    msg['From'] = gc.smtp_username
    msg['To'] = user.email
    send_email(user.email, msg, gc)
    log.info('Sent after trail ended email to user: %s', user.email, extra={'user': user})


def send_account_expiring_email(days_left, user, gc):
    env = Environment()
    temp_var = {
        'username': user.username,
        'days': days_left,
        'first_name': user.first_name,
        'last_name': user.last_name,
    }
    email_temp = env.from_string(source=gc.account_expiring_template)
    msg = MIMEText(email_temp.render(temp_var), 'html')
    msg['Subject'] = gc.account_expiring_template_subject
    msg['From'] = gc.smtp_username
    msg['To'] = user.email
    send_email(user.email, msg, gc)
    log.info('Sent account expiring email to user: %s', user.email, extra={'user': user})


def send_account_expired_email(user, gc):
    env = Environment()
    temp_var = {
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
    }
    email_temp = env.from_string(source=gc.account_expired_template)
    msg = MIMEText(email_temp.render(temp_var), 'html')
    msg['Subject'] = gc.account_expired_template_subject
    msg['From'] = gc.smtp_username
    msg['To'] = user.email
    send_email(user.email, msg, gc)
    log.info('Sent account expired email to user: %s', user.email, extra={'user': user})


def send_after_account_expired_email(days, user, gc):
    env = Environment()
    temp_var = {
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'days': days,
    }
    email_temp = env.from_string(source=gc.after_account_expiring_template)
    msg = MIMEText(email_temp.render(temp_var), 'html')
    msg['Subject'] = gc.after_account_expiring_template_subject
    msg['From'] = gc.smtp_username
    msg['To'] = user.email
    send_email(user.email, msg, gc)
    log.info('Sent after account expired email to user: %s', user.email, extra={'user': user})
