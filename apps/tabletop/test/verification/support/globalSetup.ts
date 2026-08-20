import { startFakeSpine, stopFakeSpine } from "./fakeSpine";

export default async function globalSetup() {
  await startFakeSpine();
  return async () => {
    await stopFakeSpine();
  };
}
