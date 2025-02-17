tsc
docker-buildx build . -t harbor.project-geek.cc/library/ffxiv-party-search:v1.0.0 --push --platform linux/amd64,linux/arm64 --push