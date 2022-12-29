gcloud builds submit --pack image=gcr.io/multy-worlds/ws app
gcloud run deploy ws --region=asia-northeast1 --image=gcr.io/multy-worlds/ws
gcloud run deploy ws --region=europe-west1 --image=gcr.io/multy-worlds/ws
gcloud run deploy ws --region=us-west1 --image=gcr.io/multy-worlds/ws
firebase deploy --only=hosting:multy-worlds

gcloud run deploy ws-beta --region=europe-west1 --source=beta
firebase deploy --only=hosting:beta-multy-worlds
