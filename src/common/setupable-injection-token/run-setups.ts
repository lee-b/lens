/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { DiContainer } from "@ogre-tools/injectable";
import { beforeApplicationIsReadyInjectionToken } from "../../main/start-main-application/before-application-is-ready/before-application-is-ready-injection-token";
import { onApplicationIsReadyInjectionToken } from "../../main/start-main-application/on-application-is-ready/on-application-is-ready-injection-token";

export const runSetups = async (di: DiContainer) => {
  await Promise.all(
    di
      .injectMany(beforeApplicationIsReadyInjectionToken)
      .map((setupable) => setupable.run()),
  );

  await Promise.all(
    di
      .injectMany(onApplicationIsReadyInjectionToken)
      .map((setupable) => setupable.run()),
  );
};
