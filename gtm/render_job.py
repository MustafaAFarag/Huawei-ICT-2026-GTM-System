import json
import sys
from .assets import render
if __name__=='__main__':
    print(render(json.load(sys.stdin),sys.argv[1],sys.argv[2]))
