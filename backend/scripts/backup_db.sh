#!/bin/bash

# Configuration
DB_NAME="focusticket"
DB_USER="postgres"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/$DB_NAME-$TIMESTAMP.sql"

# Créer le dossier backup s'il n'existe pas
mkdir -p $BACKUP_DIR

# 1. Exportation de la base de données (Dump)
echo "Extraction de la base de données..."
pg_dump -U $DB_USER $DB_NAME > $BACKUP_FILE

# 2. Compression du fichier backup
gzip $BACKUP_FILE
GZ_BACKUP_FILE="$BACKUP_FILE.gz"

# 3. Envoi vers le CLOUD (Exemple avec AWS S3 ou Rclone)
# Note : Vous devez installer rclone (rclone.org) ou aws-cli pour que cela fonctionne.
# rclone copy $GZ_BACKUP_FILE remote:votre-dossier-cloud/

echo "Sauvegarde terminée : $GZ_BACKUP_FILE"

# 4. (Optionnel) Effacer les backups vieux de plus de 7 jours sur la VM
find $BACKUP_DIR -type f -name "*.gz" -mtime +7 -exec rm {} \;
echo "Nettoyage des anciens backups terminé."
