FROM php:7.3-apache

RUN apt-get update \
 && apt-get install -y git zlib1g-dev libzip-dev nodejs npm \
 && npm install -g bower \
 && docker-php-ext-install zip \
 && a2enmod rewrite \
 && sed -i 's!/var/www/html!/var/www/public!g' /etc/apache2/sites-available/000-default.conf \
 && mv /var/www/html /var/www/public \
 && curl -sS https://getcomposer.org/installer \
  | php -- --install-dir=/usr/local/bin --filename=composer


CMD composer install | bower install | npm start

WORKDIR /var/www
MAINTAINER Sébastien Lampazona <lampazona.sebastien@gmail.com>