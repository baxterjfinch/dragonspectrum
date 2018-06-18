import os
import sys

def update(cur, total, bar_length=None):
    percent = float(cur) / total
    if bar_length is None:
        bar_length = getTerminalSize()[0] - len(
        "\rProgress: [{0}] {1}% [{2} of {3}]".format('', int(round(percent * 100)), cur, total))
    hashes = '#' * int(round(percent * bar_length))
    spaces = ' ' * (bar_length - len(hashes))
    sys.stdout.write("\rProgress: [{0}] {1}% [{2} of {3}]".format(hashes + spaces, int(round(percent * 100)), cur, total))
    sys.stdout.flush()