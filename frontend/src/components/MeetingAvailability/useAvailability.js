import { useState, useCallback } from "react";
import { createMockAvailability, MEMBERS } from "./availabilityUtils";

export function useAvailability() {
  const [availability, setAvailability] = useState(createMockAvailability);
  const [activeMember, setActiveMember] = useState(MEMBERS[0].id);

  const toggleCell = useCallback((memberId, day, hour) => {
    setAvailability((prev) => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        [day]: {
          ...prev[memberId][day],
          [hour]: !prev[memberId][day][hour],
        },
      },
    }));
  }, []);

  const setCell = useCallback((memberId, day, hour, value) => {
    setAvailability((prev) => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        [day]: {
          ...prev[memberId][day],
          [hour]: value,
        },
      },
    }));
  }, []);

  return { availability, activeMember, setActiveMember, toggleCell, setCell };
}
