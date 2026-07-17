import "dotenv/config";
import "@/lib/job-handlers";
import { processJobs } from "@/lib/queue";

processJobs()
  .then((results) => {
    console.log("Jobs procesados:", results);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
