FROM alpine:3.22
ARG PB_VERSION=0.40.5
RUN apk add --no-cache ca-certificates unzip wget \
 && wget -q https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
 && unzip -q pocketbase_${PB_VERSION}_linux_amd64.zip -d /pb && rm pocketbase_*.zip
WORKDIR /pb
COPY pb_migrations ./pb_migrations
COPY pb_hooks ./pb_hooks
COPY pb_public ./pb_public
COPY scripts/iniciar.sh ./iniciar.sh
EXPOSE 8090
CMD ["sh", "./iniciar.sh"]
