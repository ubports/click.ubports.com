#!/bin/bash

set -ex

echo building $1

mkdir build
git clone $1 build
cd build
clickable -k 16.04
cd ..
exit 0
