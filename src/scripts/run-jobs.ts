import "dotenv/config";
import { processJobs } from "@/lib/jobs";

processJobs()
  .then((results) => {
    console.log("Jobs procesados:", results);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
