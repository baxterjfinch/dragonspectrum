import os
import sys

def getTerminalSize():
    env = os.environ
    def ioctl_GWINSZ(fd):
        try:
            import fcntl, termios, struct, os
            cr = struct.unpack('hh', fcntl.ioctl(fd, termios.TIOCGWINSZ,
        '1234'))
        except:
            return
        return cr
    cr = ioctl_GWINSZ(0) or ioctl_GWINSZ(1) or ioctl_GWINSZ(2)
    if not cr:
        try:
            fd = os.open(os.ctermid(), os.O_RDONLY)
            cr = ioctl_GWINSZ(fd)
            os.close(fd)
        except:
            pass
    if not cr:
        cr = (env.get('LINES', 25), env.get('COLUMNS', 80))
    return int(cr[1]), int(cr[0])

def update(cur, total, bar_length=None):
    percent = float(cur) / total
    if bar_length is None:
        bar_length = getTerminalSize()[0] - len(
        "\rProgress: [{0}] {1}% [{2} of {3}]".format('', int(round(percent * 100)), cur, total))
    hashes = '#' * int(round(percent * bar_length))
    spaces = ' ' * (bar_length - len(hashes))
    sys.stdout.write("\rProgress: [{0}] {1}% [{2} of {3}]".format(hashes + spaces, int(round(percent * 100)), cur, total))
    sys.stdout.flush()