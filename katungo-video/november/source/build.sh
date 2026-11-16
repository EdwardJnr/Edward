#!/bin/bash
# build.sh name D E transpose 'sfx_json'  -> out_<name>.mp4 (<3MB)
set -e
cd "$(dirname "$0")"
N=$1; D=$2; E=$3; TR=$4; SPEC=$5
node render2.js "$PWD/k/$N.html" "$PWD/fr_$N" "$D"
python3 music2.py "$PWD/wav_$N.wav" "$D" "$E" "$TR" "$SPEC"
./enc.sh "$PWD/fr_$N" "$PWD/wav_$N.wav" "$PWD/out_$N.mp4" "$D"
