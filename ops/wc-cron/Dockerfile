# Autonomous World Cup resolver. Railway runs this container on the schedule in
# railway.json; it pokes the idempotent resolve endpoint (which holds the
# resolver key) to settle any newly-finished result on-chain, then exits.
FROM curlimages/curl:latest
CMD ["-fsS", "-X", "POST", "https://tryheckle.xyz/api/worldcup/resolve"]
