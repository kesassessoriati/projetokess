#!/bin/sh
# line endings must be \n, not \r\n

echo "window._env_ = {" > /usr/share/nginx/html/env-config.js
for var in $(env | grep REACT_APP_); do
  key=$(echo $var | cut -d '=' -f 1)
  value=$(echo $var | cut -d '=' -f 2-)
  echo "  $key: \"$value\"," >> /usr/share/nginx/html/env-config.js
done
echo "};" >> /usr/share/nginx/html/env-config.js

exec "$@"
