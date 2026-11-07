#!/bin/sh
# Checks the Supabase sign-in setup without signing anyone in (uses a fake token).
# Usage: sh scripts/check-auth.sh
U=$(grep VITE_SUPABASE_URL .env | cut -d= -f2 | tr -d '"')
R=$(curl -s -o /dev/null -w "%{redirect_url}" "$U/auth/v1/verify?token=check&type=magiclink&redirect_to=https://dust-assessment.com/dashboard")
case "$R" in
  https://dust-assessment.com/*) echo "OK  Supabase renvoie vers dust-assessment.com" ;;
  *) echo "KO  Supabase renvoie vers : ${R%%#*}  -> Authentication > URL Configuration" ; exit 1 ;;
esac
S=$(curl -s -o /dev/null -w "%{http_code}" https://dust-assessment.com/auth/confirm)
[ "$S" = 200 ] && echo "OK  dust-assessment.com/auth/confirm est en ligne" || { echo "KO  /auth/confirm répond $S (commits poussés ?)"; exit 1; }
