python3 os_tools.py


pm2 start --name bean-be "npm run start:dev"

pm2 start "sudo http-server dist/bean-engine-fe -p 80" --name bean-fe