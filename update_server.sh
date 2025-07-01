#!/bin/bash

LOGFILE="/var/log/server-update.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] === Startar uppdatering ===" | sudo tee -a "$LOGFILE"

echo "[$TIMESTAMP] Kör: apt-get update" | sudo tee -a "$LOGFILE"
sudo apt-get update | sudo tee -a "$LOGFILE"

echo "[$TIMESTAMP] Kör: apt-get upgrade -y" | sudo tee -a "$LOGFILE"
sudo apt-get upgrade -y | sudo tee -a "$LOGFILE"

echo "[$TIMESTAMP] Kör: apt-get full-upgrade -y" | sudo tee -a "$LOGFILE"
sudo apt-get full-upgrade -y | sudo tee -a "$LOGFILE"

echo "[$TIMESTAMP] Kör: apt-get autoremove -y" | sudo tee -a "$LOGFILE"
sudo apt-get autoremove -y | sudo tee -a "$LOGFILE"

echo "[$TIMESTAMP] Kör: apt-get clean" | sudo tee -a "$LOGFILE"
sudo apt-get clean | sudo tee -a "$LOGFILE"

if [ -f /var/run/reboot-required ]; then
  echo "[$TIMESTAMP] 🔁 Omstart krävs." | sudo tee -a "$LOGFILE"
  read -p "❓ Vill du starta om nu? (j/n): " choice
  if [[ "$choice" =~ ^[Jj]$ ]]; then
    echo "[$TIMESTAMP] Startar om..." | sudo tee -a "$LOGFILE"
    sudo reboot
  else
    echo "[$TIMESTAMP] Omstart avbröts av användaren." | sudo tee -a "$LOGFILE"
  fi
else
  echo "[$TIMESTAMP] ✅ Ingen omstart krävs." | sudo tee -a "$LOGFILE"
fi

echo "[$TIMESTAMP] === Uppdatering klar ===" | sudo tee -a "$LOGFILE"

echo "Skickar loggfil till epostadress"
node /var/opt/update_os/send_log.js