CREATE USER IF NOT EXISTS 'utente'@'%' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON projectpro.* TO 'projectpro'@'%';
FLUSH PRIVILEGES;