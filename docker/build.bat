@echo off
set IMAGE_NAME=lucap9056/chiwawa
set /p TAG="Enter the Docker image tag (leave empty for latest): "

if "%TAG%"=="" (
    docker build -f docker/Dockerfile -t %IMAGE_NAME%:latest .
) else (
    docker build -f docker/Dockerfile -t %IMAGE_NAME%:%TAG% .
    docker rmi %IMAGE_NAME%:latest
    docker tag %IMAGE_NAME%:%TAG% %IMAGE_NAME%:latest
)
