FROM fabric8/alpine-caddy:latest
MAINTAINER Juraci Paixão Kröhling <jpkroehling+docker@redhat.com>

ADD build /var/www/html
