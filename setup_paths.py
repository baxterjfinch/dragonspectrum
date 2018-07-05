import os
import sys


def fix_path():
    pass
    # lib_path = os.path.join(os.path.dirname(__file__), 'lib')
    # if lib_path not in sys.path:
    #     sys.path.insert(0, lib_path)


def get_lib_path():
    return os.path.join(os.path.dirname(__file__), 'lib')