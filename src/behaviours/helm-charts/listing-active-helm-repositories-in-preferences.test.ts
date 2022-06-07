/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { RenderResult } from "@testing-library/react";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import type { ReadYamlFile } from "../../common/fs/read-yaml-file.injectable";
import readYamlFileInjectable from "../../common/fs/read-yaml-file.injectable";
import type { AsyncFnMock } from "@async-fn/jest";
import asyncFn from "@async-fn/jest";
import type { HelmRepositoriesFromYaml } from "../../main/helm/repositories/get-active-helm-repositories/get-active-helm-repositories.injectable";
import execFileInjectable from "../../common/fs/exec-file.injectable";
import helmBinaryPathInjectable from "../../main/helm/helm-binary-path.injectable";
import loggerInjectable from "../../common/logger.injectable";
import type { Logger } from "../../common/logger";
import callForPublicHelmRepositoriesInjectable from "../../renderer/components/+preferences/kubernetes/helm-charts/activation-of-public-helm-repository/public-helm-repositories/call-for-public-helm-repositories.injectable";
import showErrorNotificationInjectable
  from "../../renderer/components/notifications/show-error-notification.injectable";

// TODO: Make tooltips free of side effects by making it deterministic
jest.mock("../../renderer/components/tooltip/withTooltip", () => ({
  withTooltip: (target: any) => target,
}));

describe("listing active helm repositories in preferences", () => {
  let applicationBuilder: ApplicationBuilder;
  let rendered: RenderResult;
  let readYamlFileMock: AsyncFnMock<ReadYamlFile>;
  let execFileMock: AsyncFnMock<ReturnType<typeof execFileInjectable["instantiate"]>>;
  let loggerStub: Logger;
  let showErrorNotificationMock: jest.Mock;

  beforeEach(async () => {
    applicationBuilder = getApplicationBuilder();

    readYamlFileMock = asyncFn();
    execFileMock = asyncFn();

    loggerStub = { error: jest.fn() } as unknown as Logger;

    applicationBuilder.beforeApplicationStart(({ mainDi, rendererDi }) => {
      showErrorNotificationMock = jest.fn();

      rendererDi.override(showErrorNotificationInjectable, () => showErrorNotificationMock);
      rendererDi.override(callForPublicHelmRepositoriesInjectable, () => async () => []);
      mainDi.override(readYamlFileInjectable, () => readYamlFileMock);
      mainDi.override(execFileInjectable, () => execFileMock);
      mainDi.override(helmBinaryPathInjectable, () => "some-helm-binary-path");
      mainDi.override(loggerInjectable, () => loggerStub);
    });

    rendered = await applicationBuilder.render();
  });

  describe("when navigating to preferences containing helm repositories", () => {
    beforeEach(async () => {
      applicationBuilder.preferences.navigate();
      applicationBuilder.preferences.navigation.click("kubernetes");
    });

    it("renders", () => {
      expect(rendered.baseElement).toMatchSnapshot();
    });

    it("shows loader for repositories", () => {
      expect(
        rendered.getByTestId("helm-repositories-are-loading"),
      ).toBeInTheDocument();
    });

    it("calls for helm configuration", () => {
      expect(execFileMock).toHaveBeenCalledWith(
        "some-helm-binary-path",
        ["env"],
      );
    });

    it("does not call for updating of repositories yet", () => {
      expect(execFileMock).not.toHaveBeenCalledWith(
        "some-helm-binary-path",
        ["repo", "update"],
      );
    });

    describe("when getting configuration rejects", () => {
      beforeEach(async () => {
        await execFileMock.reject("some-error");
      });

      it("shows error notification", () => {
        expect(showErrorNotificationMock).toHaveBeenCalledWith(
          "Error getting Helm configuration: some-error",
        );
      });

      it("removes all helm controls", () => {
        expect(
          rendered.queryByTestId("helm-controls"),
        ).not.toBeInTheDocument();
      });

      it("does not show loader for repositories anymore", () => {
        expect(
          rendered.queryByTestId("helm-repositories-are-loading"),
        ).not.toBeInTheDocument();
      });

      it("renders", () => {
        expect(rendered.baseElement).toMatchSnapshot();
      });
    });

    describe("when configuration resolves without path to repository config file", () => {
      beforeEach(async () => {
        execFileMock.mockClear();

        await execFileMock.resolveSpecific(
          ["some-helm-binary-path", ["env"]],
          "HELM_REPOSITORY_CACHE=some-helm-repository-cache-path",
        );
      });

      it("logs error", () => {
        expect(loggerStub.error).toHaveBeenCalledWith(
          "Tried to get Helm repositories, but HELM_REPOSITORY_CONFIG was not present in `$ helm env`.",
        );
      });

      it("shows error notification", () => {
        expect(showErrorNotificationMock).toHaveBeenCalledWith(
          "Error getting Helm configuration: Tried to get Helm repositories, but HELM_REPOSITORY_CONFIG was not present in `$ helm env`.",
        );
      });

      it("removes all helm controls", () => {
        expect(
          rendered.queryByTestId("helm-controls"),
        ).not.toBeInTheDocument();
      });

      it("does not show loader for repositories anymore", () => {
        expect(
          rendered.queryByTestId("helm-repositories-are-loading"),
        ).not.toBeInTheDocument();
      });

      it("renders", () => {
        expect(rendered.baseElement).toMatchSnapshot();
      });
    });

    describe("when configuration resolves without path to repository cache directory", () => {
      beforeEach(async () => {
        execFileMock.mockClear();

        await execFileMock.resolveSpecific(
          ["some-helm-binary-path", ["env"]],
          "HELM_REPOSITORY_CONFIG=some-helm-repository-config-file.yaml",
        );
      });

      it("logs error", () => {
        expect(loggerStub.error).toHaveBeenCalledWith(
          "Tried to get Helm repositories, but HELM_REPOSITORY_CACHE was not present in `$ helm env`.",
        );
      });

      it("shows error notification", () => {
        expect(showErrorNotificationMock).toHaveBeenCalledWith(
          "Error getting Helm configuration: Tried to get Helm repositories, but HELM_REPOSITORY_CACHE was not present in `$ helm env`.",
        );
      });

      it("removes all helm controls", () => {
        expect(
          rendered.queryByTestId("helm-controls"),
        ).not.toBeInTheDocument();
      });

      it("does not show loader for repositories anymore", () => {
        expect(
          rendered.queryByTestId("helm-repositories-are-loading"),
        ).not.toBeInTheDocument();
      });

      it("renders", () => {
        expect(rendered.baseElement).toMatchSnapshot();
      });
    });

    describe("when configuration resolves", () => {
      beforeEach(async () => {
        execFileMock.mockClear();

        await execFileMock.resolveSpecific(
          ["some-helm-binary-path", ["env"]],

          [
            "HELM_REPOSITORY_CONFIG=some-helm-repository-config-file.yaml",
            "HELM_REPOSITORY_CACHE=some-helm-repository-cache-path",
          ].join("\n"),
        );
      });

      it("renders", () => {
        expect(rendered.baseElement).toMatchSnapshot();
      });

      it("calls for update of repositories", () => {
        expect(execFileMock).toHaveBeenCalledWith(
          "some-helm-binary-path",
          ["repo", "update"],
        );
      });

      it("does not call for repositories yet", () => {
        expect(readYamlFileMock).not.toHaveBeenCalled();
      });

      describe("when updating repositories reject", () => {
        beforeEach(async () => {
          await execFileMock.reject("Some error");
        });

        it("shows error notification", () => {
          expect(showErrorNotificationMock).toHaveBeenCalledWith(
            "Error updating Helm repositories: Some error",
          );
        });

        it("removes all helm controls", () => {
          expect(
            rendered.queryByTestId("helm-controls"),
          ).not.toBeInTheDocument();
        });

        it("does not show loader for repositories anymore", () => {
          expect(
            rendered.queryByTestId("helm-repositories-are-loading"),
          ).not.toBeInTheDocument();
        });

        it("renders", () => {
          expect(rendered.baseElement).toMatchSnapshot();
        });
      });

      describe("when updating repositories resolve", () => {
        beforeEach(async () => {
          execFileMock.mockClear();

          await execFileMock.resolveSpecific(
            ["some-helm-binary-path", ["repo", "update"]],
            "",
          );
        });

        it("loads repositories from file system", () => {
          expect(readYamlFileMock).toHaveBeenCalledWith(
            "some-helm-repository-config-file.yaml",
          );
        });

        describe("when loading repositories resolves with existing repositories", () => {
          beforeEach(async () => {
            execFileMock.mockClear();

            await readYamlFileMock.resolveSpecific(
              ["some-helm-repository-config-file.yaml"],
              repositoryConfigStub,
            );
          });

          it("does not add default repository", () => {
            expect(execFileMock).not.toHaveBeenCalledWith(
              "some-helm-binary-path",
              ["repo", "add", "bitnami", "https://charts.bitnami.com/bitnami"],
            );
          });

          it("renders", () => {
            expect(rendered.baseElement).toMatchSnapshot();
          });

          it("does not show loader for repositories anymore", () => {
            expect(
              rendered.queryByTestId("helm-repositories-are-loading"),
            ).not.toBeInTheDocument();
          });

          it("shows repositories in use", () => {
            const actual = rendered.getAllByTestId(
              /^helm-repository-(some-repository|some-other-repository)$/,
            );

            expect(actual).toHaveLength(2);
          });
        });

        describe("when loading repositories resolves with no existing repositories", () => {
          beforeEach(async () => {
            execFileMock.mockClear();

            await readYamlFileMock.resolveSpecific(
              ["some-helm-repository-config-file.yaml"],
              { repositories: [] },
            );
          });

          it("renders", () => {
            expect(rendered.baseElement).toMatchSnapshot();
          });

          it("still shows the loader for repositories", () => {
            expect(
              rendered.queryByTestId("helm-repositories-are-loading"),
            ).toBeInTheDocument();
          });

          it('adds "bitnami" as default repository', () => {
            expect(execFileMock).toHaveBeenCalledWith(
              "some-helm-binary-path",
              ["repo", "add", "bitnami", "https://charts.bitnami.com/bitnami"],
            );
          });

          describe("when adding default repository reject", () => {
            beforeEach(async () => {
              await execFileMock.reject("Some error");
            });

            it("shows error notification", () => {
              expect(showErrorNotificationMock).toHaveBeenCalledWith(
                "Error when adding default Helm repository: Some error",
              );
            });

            it("removes all helm controls", () => {
              expect(
                rendered.queryByTestId("helm-controls"),
              ).not.toBeInTheDocument();
            });

            it("does not show loader for repositories anymore", () => {
              expect(
                rendered.queryByTestId("helm-repositories-are-loading"),
              ).not.toBeInTheDocument();
            });

            it("renders", () => {
              expect(rendered.baseElement).toMatchSnapshot();
            });
          });

          describe("when adding of default repository resolves", () => {
            beforeEach(async () => {
              readYamlFileMock.mockClear();

              await execFileMock.resolveSpecific(
                [
                  "some-helm-binary-path",

                  [
                    "repo",
                    "add",
                    "bitnami",
                    "https://charts.bitnami.com/bitnami",
                  ],
                ],

                "",
              );
            });

            it("renders", () => {
              expect(rendered.baseElement).toMatchSnapshot();
            });

            it("still shows the loader for repositories", () => {
              expect(
                rendered.queryByTestId("helm-repositories-are-loading"),
              ).toBeInTheDocument();
            });

            it("calls for repositories again", () => {
              expect(readYamlFileMock).toHaveBeenCalledWith(
                "some-helm-repository-config-file.yaml",
              );
            });

            describe("when another call for repositories resolve", () => {
              beforeEach(async () => {
                await readYamlFileMock.resolveSpecific(
                  ["some-helm-repository-config-file.yaml"],

                  {
                    repositories: [
                      {
                        name: "bitnami",
                        url: "https://charts.bitnami.com/bitnami",
                        caFile: "irrelevant",
                        certFile: "irrelevant",
                        insecure_skip_tls_verify: false,
                        keyFile: "irrelevant",
                        pass_credentials_all: false,
                        password: "irrelevant",
                        username: "irrelevant",
                      },
                    ],
                  },
                );
              });

              it("does not show loader for repositories anymore", () => {
                expect(
                  rendered.queryByTestId("helm-repositories-are-loading"),
                ).not.toBeInTheDocument();
              });

              it("shows the added repository", () => {
                const actual = rendered.getByTestId("helm-repository-bitnami");

                expect(actual).toBeInTheDocument();
              });
            });
          });
        });
      });
    });
  });
});

const repositoryConfigStub: HelmRepositoriesFromYaml = {
  repositories: [
    {
      name: "some-repository",
      url: "some-repository-url",
      caFile: "irrelevant",
      certFile: "irrelevant",
      insecure_skip_tls_verify: false,
      keyFile: "irrelevant",
      pass_credentials_all: false,
      password: "irrelevant",
      username: "irrelevant",
    },

    {
      name: "some-other-repository",
      url: "some-other-repository-url",
      caFile: "irrelevant",
      certFile: "irrelevant",
      insecure_skip_tls_verify: false,
      keyFile: "irrelevant",
      pass_credentials_all: false,
      password: "irrelevant",
      username: "irrelevant",
    },
  ],
};
