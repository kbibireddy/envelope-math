import { describe, expect, it } from "vitest";
import {
  CAPACITY_PROFILES,
  assessCapacityInput,
  getCapacityProfile,
  profilesForCategory
} from "./capacityProfiles.js";

describe("capacityProfiles", () => {
  it("covers the core systems users ask about", () => {
    const ids = CAPACITY_PROFILES.map((profile) => profile.id);
    for (const id of [
      "postgres",
      "dynamodb",
      "cassandra",
      "kafka",
      "kinesis",
      "sqs",
      "ecs",
      "lambda"
    ]) {
      expect(ids).toContain(id);
    }
  });

  it("returns profiles by category and id", () => {
    expect(profilesForCategory("database").length).toBeGreaterThanOrEqual(3);
    expect(getCapacityProfile("postgres")?.conservativeTps).toBe(5_000);
    expect(getCapacityProfile("missing")).toBeNull();
  });

  it("flags inputs outside the modern envelope", () => {
    const postgres = getCapacityProfile("postgres");
    expect(postgres).not.toBeNull();
    expect(assessCapacityInput(postgres, 5_000).level).toBe("ok");
    expect(assessCapacityInput(postgres, 50).level).toBe("low");
    expect(assessCapacityInput(postgres, 500_000).level).toBe("high");
    expect(assessCapacityInput(postgres, 0).level).toBe("empty");
  });
});
