#!/bin/bash
# enc.sh frames_dir wav out.mp4 duration  -> 2-pass, target < 2.9MB
F=$1; A=$2; O=$3; D=$4
VB=$(python3 -c "print(int((2.7*8*1024*1024/$D - 128000)/1000))")
cd $(dirname $O)
ffmpeg -v error -y -framerate 30 -i $F/f%04d.jpg -c:v libx264 -preset slow -b:v ${VB}k -pass 1 -passlogfile /tmp/x264p -pix_fmt yuv420p -an -f mp4 /dev/null
ffmpeg -v error -y -framerate 30 -i $F/f%04d.jpg -i $A -c:v libx264 -preset slow -b:v ${VB}k -pass 2 -passlogfile /tmp/x264p -pix_fmt yuv420p -profile:v high -c:a aac -b:a 128k -t $D -movflags +faststart $O
ls -l $O | awk '{print $5}'
