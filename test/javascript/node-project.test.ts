import * as yaml from "yaml";
import { PROJEN_MARKER } from "../../src/common";
import { DependencyType } from "../../src/dependencies";
import { GithubCredentials } from "../../src/github";
import { JobPermission } from "../../src/github/workflows-model";
import {
  NodeProject,
  NodeProjectOptions,
  NodePackage,
  NpmAccess,
} from "../../src/javascript";
import { JsonFile } from "../../src/json";
import * as logging from "../../src/logging";
import { Project } from "../../src/project";
import { SampleFile } from "../../src/sample-file";
import { TaskRuntime } from "../../src/task-runtime";
import { synthSnapshot, TestProject } from "../util";

logging.disable();

test("license file is added by default", () => {
  // WHEN
  const project = new TestNodeProject();

  // THEN
  expect(synthSnapshot(project).LICENSE).toContain("Apache License");
});

test("license file is not added if licensed is false", () => {
  // WHEN
  const project = new TestNodeProject({
    licensed: false,
  });

  // THEN
  const snapshot = synthSnapshot(project);
  expect(snapshot.LICENSE).toBeUndefined();
  expect(snapshot[".gitignore"]).not.toContain("LICENSE");
  expect(snapshot["package.json"].license).toEqual("UNLICENSED");
});

describe("deps", () => {
  test("runtime deps", () => {
    // GIVEN
    const project = new TestNodeProject({
      deps: ["aaa@^1.2.3", "bbb@~4.5.6"],
    });

    // WHEN
    project.addDeps("ccc");
    project.deps.addDependency("ddd", DependencyType.RUNTIME);

    // THEN
    const pkgjson = packageJson(project);
    expect(pkgjson.dependencies).toStrictEqual({
      aaa: "^1.2.3",
      bbb: "~4.5.6",
      ccc: "*",
      ddd: "*",
    });
    expect(pkgjson.peerDependencies).toBeUndefined();
  });

  test("dev dependencies", () => {
    // GIVEN
    const project = new TestNodeProject({
      devDeps: ["aaa@^1.2.3", "bbb@~4.5.6"],
    });

    // WHEN
    project.addDevDeps("ccc");
    project.deps.addDependency("ddd", DependencyType.TEST);
    project.deps.addDependency("eee@^1", DependencyType.DEVENV);
    project.deps.addDependency("fff@^2", DependencyType.BUILD);

    // THEN
    const pkgjson = packageJson(project);
    expect(pkgjson.devDependencies.aaa).toStrictEqual("^1.2.3");
    expect(pkgjson.devDependencies.bbb).toStrictEqual("~4.5.6");
    expect(pkgjson.devDependencies.ccc).toStrictEqual("*");
    expect(pkgjson.devDependencies.ddd).toStrictEqual("*");
    expect(pkgjson.devDependencies.eee).toStrictEqual("^1");
    expect(pkgjson.devDependencies.fff).toStrictEqual("^2");
    expect(pkgjson.peerDependencies).toBeUndefined();
    expect(pkgjson.dependencieds).toBeUndefined();
  });

  test("peerDependencies", () => {
    // GIVEN
    const project = new TestNodeProject({
      peerDeps: ["aaa@^1.2.3", "bbb@~4.5.6"],
    });

    // WHEN
    project.addPeerDeps("ccc");
    project.deps.addDependency("ddd", DependencyType.PEER);

    // THEN
    const pkgjson = packageJson(project);
    expect(pkgjson.peerDependencies).toStrictEqual({
      aaa: "^1.2.3",
      bbb: "~4.5.6",
      ccc: "*",
      ddd: "*",
    });

    // devDependencies are added with pinned versions
    expect(pkgjson.devDependencies.aaa).toStrictEqual("1.2.3");
    expect(pkgjson.devDependencies.bbb).toStrictEqual("4.5.6");
    expect(pkgjson.devDependencies.ccc).toStrictEqual("*");
    expect(pkgjson.devDependencies.ddd).toStrictEqual("*");
    expect(pkgjson.dependencieds).toBeUndefined();
  });

  test("peerDependencies without pinnedDevDep", () => {
    // GIVEN
    const project = new TestNodeProject({
      peerDependencyOptions: {
        pinnedDevDependency: false,
      },
      peerDeps: ["aaa@^1.2.3", "bbb@~4.5.6"],
    });

    // WHEN
    project.addPeerDeps("ccc");
    project.deps.addDependency("ddd", DependencyType.PEER);

    // THEN
    const pkgjson = packageJson(project);
    expect(pkgjson.peerDependencies).toStrictEqual({
      aaa: "^1.2.3",
      bbb: "~4.5.6",
      ccc: "*",
      ddd: "*",
    });

    // sanitize
    [
      "npm-check-updates",
      "jest",
      "jest-junit",
      "projen",
      "standard-version",
    ].forEach((d) => delete pkgjson.devDependencies[d]);

    expect(pkgjson.devDependencies).toStrictEqual({});
    expect(pkgjson.dependencieds).toBeUndefined();
  });

  test("devDeps are only added for peerDeps if a runtime dep does not already exist", () => {
    // GIVEN
    const project = new TestNodeProject();

    // WHEN
    project.addPeerDeps("ccc@^2");
    project.addDeps("ccc@^2.3.3");

    // THEN
    const pkgjson = packageJson(project);

    // sanitize
    [
      "npm-check-updates",
      "jest",
      "jest-junit",
      "projen",
      "standard-version",
    ].forEach((d) => delete pkgjson.devDependencies[d]);

    expect(pkgjson.peerDependencies).toStrictEqual({ ccc: "^2" });
    expect(pkgjson.dependencies).toStrictEqual({ ccc: "^2.3.3" });
    expect(pkgjson.devDependencies).toStrictEqual({});
  });

  test("bundled deps are automatically added as normal deps", () => {
    // GIVEN
    const project = new TestNodeProject({
      bundledDeps: ["hey@2.1.1"],
    });

    // WHEN
    project.addBundledDeps("foo@^1.2.3");
    project.deps.addDependency("bar@~1.0.0", DependencyType.BUNDLED);

    // THEN
    const pkgjson = packageJson(project);
    expect(pkgjson.dependencies).toStrictEqual({
      hey: "2.1.1",
      foo: "^1.2.3",
      bar: "~1.0.0",
    });
    expect(pkgjson.bundledDependencies).toStrictEqual(["bar", "foo", "hey"]);
  });
});

describe("deps upgrade", () => {
  test("throws when trying to auto approve deps but auto approve is not defined", () => {
    expect(() => {
      new TestNodeProject({ autoApproveUpgrades: true });
    }).toThrow(
      "Automatic approval of dependencies upgrades requires configuring `autoApproveOptions`"
    );
  });

  test("workflow can be auto approved", () => {
    const project = new TestNodeProject({
      autoApproveOptions: {
        allowedUsernames: ["dummy"],
        secret: "dummy",
      },
      autoApproveUpgrades: true,
    });

    const snapshot = yaml.parse(
      synthSnapshot(project)[".github/workflows/upgrade-main.yml"]
    );
    expect(snapshot.jobs.pr.steps[4].with.labels).toStrictEqual(
      project.autoApprove?.label
    );
  });

  test("commit can be signed", () => {
    const project = new TestNodeProject({
      depsUpgradeOptions: {
        signoff: true,
      },
    });

    const snapshot = yaml.parse(
      synthSnapshot(project)[".github/workflows/upgrade-main.yml"]
    );
    expect(snapshot.jobs.pr).toMatchSnapshot();
  });

  test("dependabot can be auto approved", () => {
    const project = new TestNodeProject({
      dependabot: true,
      autoApproveOptions: {
        allowedUsernames: ["dummy"],
        secret: "dummy",
      },
      autoApproveUpgrades: true,
    });

    const snapshot = yaml.parse(
      synthSnapshot(project)[".github/dependabot.yml"]
    );
    expect(snapshot.updates[0].labels).toStrictEqual(["auto-approve"]);
  });

  test("throws when dependabot is configued with depsUpgrade", () => {
    expect(() => {
      new TestNodeProject({ dependabot: true, depsUpgrade: true });
    }).toThrow("'dependabot' cannot be configured together with 'depsUpgrade'");
  });

  test("can specity nested config withtout loosing default values", () => {
    const project = new TestNodeProject({
      autoApproveUpgrades: true,
      autoApproveOptions: {
        label: "auto-approve",
        secret: "GITHUB_TOKEN",
      },
      depsUpgradeOptions: {
        workflowOptions: {
          projenCredentials: GithubCredentials.fromPersonalAccessToken({
            secret: "PROJEN_SECRET",
          }),
        },
      },
    });
    const snapshot = synthSnapshot(project);
    const upgrade = yaml.parse(snapshot[".github/workflows/upgrade-main.yml"]);

    // we expect the default auto-approve label to be applied
    expect(upgrade.jobs.pr.steps[4].with.labels).toEqual("auto-approve");
  });

  test("git identity of the upgrade workflow is customizable", () => {
    const project = new TestNodeProject({
      workflowGitIdentity: {
        name: "hey",
        email: "there@foo.com",
      },
    });

    const snapshot = synthSnapshot(project);
    const upgrade = yaml.parse(snapshot[".github/workflows/upgrade-main.yml"]);

    // we expect the default auto-approve label to be applied
    expect(upgrade.jobs.pr.steps[3]).toStrictEqual({
      name: "Set git identity",
      run: [
        'git config user.name "hey"',
        'git config user.email "there@foo.com"',
      ].join("\n"),
    });
  });
});

describe("npm publishing options", () => {
  test("defaults", () => {
    // GIVEN
    const project = new TestProject();

    // WHEN
    const npm = new NodePackage(project, {
      packageName: "my-package",
    });

    // THEN
    expect(npm.npmAccess).toStrictEqual(NpmAccess.PUBLIC);
    expect(npm.npmRegistry).toStrictEqual("registry.npmjs.org");
    expect(npm.npmRegistryUrl).toStrictEqual("https://registry.npmjs.org/");
    expect(npm.npmTokenSecret).toStrictEqual("NPM_TOKEN");

    // since these are all defaults, publishConfig is not defined.
    expect(
      synthSnapshot(project)["package.json"].publishConfig
    ).toBeUndefined();
  });

  test("scoped packages default to RESTRICTED access", () => {
    // GIVEN
    const project = new TestProject();

    // WHEN
    const npm = new NodePackage(project, {
      packageName: "scoped@my-package",
    });

    // THEN
    expect(npm.npmAccess).toStrictEqual(NpmAccess.RESTRICTED);

    // since these are all defaults, publishConfig is not defined.
    expect(packageJson(project).publishConfig).toBeUndefined();
  });

  test("non-scoped package cannot be RESTRICTED", () => {
    // GIVEN
    const project = new TestProject();

    // THEN
    expect(
      () =>
        new NodePackage(project, {
          packageName: "my-package",
          npmAccess: NpmAccess.RESTRICTED,
        })
    ).toThrow(/"npmAccess" cannot be RESTRICTED for non-scoped npm package/);
  });

  test("custom settings", () => {
    // GIVEN
    const project = new TestProject();

    // WHEN
    const npm = new NodePackage(project, {
      packageName: "scoped@my-package",
      npmRegistryUrl: "https://foo.bar",
      npmAccess: NpmAccess.PUBLIC,
      npmTokenSecret: "GITHUB_TOKEN",
    });

    // THEN
    expect(npm.npmRegistry).toStrictEqual("foo.bar");
    expect(npm.npmRegistryUrl).toStrictEqual("https://foo.bar/");
    expect(npm.npmAccess).toStrictEqual(NpmAccess.PUBLIC);
    expect(npm.npmTokenSecret).toStrictEqual("GITHUB_TOKEN");
    expect(packageJson(project).publishConfig).toStrictEqual({
      access: "public",
      registry: "https://foo.bar/",
    });
  });

  test("registry with path", () => {
    // GIVEN
    const project = new TestProject();

    // WHEN
    const npm = new NodePackage(project, {
      npmRegistryUrl: "https://foo.bar/path/",
    });

    // THEN
    expect(npm.npmRegistry).toStrictEqual("foo.bar/path/");
    expect(npm.npmRegistryUrl).toStrictEqual("https://foo.bar/path/");
    expect(packageJson(project).publishConfig).toStrictEqual({
      registry: "https://foo.bar/path/",
    });
  });

  test("AWS CodeArtifact registry", () => {
    // GIVEN
    const project = new TestProject();

    // WHEN
    const npm = new NodePackage(project, {
      npmRegistryUrl:
        "https://my-domain-111122223333.d.codeartifact.us-west-2.amazonaws.com/npm/my_repo/",
    });

    // THEN
    expect(npm.npmRegistry).toStrictEqual(
      "my-domain-111122223333.d.codeartifact.us-west-2.amazonaws.com/npm/my_repo/"
    );
    expect(npm.npmRegistryUrl).toStrictEqual(
      "https://my-domain-111122223333.d.codeartifact.us-west-2.amazonaws.com/npm/my_repo/"
    );
    expect(packageJson(project).publishConfig).toStrictEqual({
      registry:
        "https://my-domain-111122223333.d.codeartifact.us-west-2.amazonaws.com/npm/my_repo/",
    });
    expect(npm.codeArtifactOptions?.accessKeyIdSecret).toStrictEqual(
      "AWS_ACCESS_KEY_ID"
    );
    expect(npm.codeArtifactOptions?.secretAccessKeySecret).toStrictEqual(
      "AWS_SECRET_ACCESS_KEY"
    );
  });

  test("AWS CodeArtifact registry custom values", () => {
    // GIVEN
    const project = new TestProject();

    // WHEN
    const npm = new NodePackage(project, {
      npmRegistryUrl:
        "https://my-domain-111122223333.d.codeartifact.us-west-2.amazonaws.com/npm/my_repo/",
      codeArtifactOptions: {
        accessKeyIdSecret: "OTHER_AWS_ACCESS_KEY_ID",
        secretAccessKeySecret: "OTHER_AWS_SECRET_ACCESS_KEY",
      },
    });

    // THEN
    expect(npm.codeArtifactOptions?.accessKeyIdSecret).toStrictEqual(
      "OTHER_AWS_ACCESS_KEY_ID"
    );
    expect(npm.codeArtifactOptions?.secretAccessKeySecret).toStrictEqual(
      "OTHER_AWS_SECRET_ACCESS_KEY"
    );
  });

  test("throw when 'npmTokenSecret' is used with AWS CodeArtifact", () => {
    // GIVEN
    const project = new TestProject();

    // THEN
    expect(() => {
      new NodePackage(project, {
        npmRegistryUrl:
          "https://my-domain-111122223333.d.codeartifact.us-west-2.amazonaws.com/npm/my_repo/",
        npmTokenSecret: "INVALID_VALUE",
      });
    }).toThrow(
      '"npmTokenSecret" must not be specified when publishing AWS CodeArtifact.'
    );
  });

  test("throw when 'codeArtifactOptions.accessKeyIdSecret' or 'codeArtifactOptions.secretAccessKeySecret' is used without AWS CodeArtifact", () => {
    // GIVEN
    const project = new TestProject();

    // THEN
    expect(() => {
      new NodePackage(project, {
        codeArtifactOptions: {
          accessKeyIdSecret: "INVALID_AWS_ACCESS_KEY_ID",
        },
      });
    }).toThrow(
      "codeArtifactOptions must only be specified when publishing AWS CodeArtifact."
    );
    expect(() => {
      new NodePackage(project, {
        codeArtifactOptions: {
          secretAccessKeySecret: "INVALID_AWS_SECRET_ACCESS_KEY",
        },
      });
    }).toThrow(
      "codeArtifactOptions must only be specified when publishing AWS CodeArtifact."
    );
  });

  test("AWS CodeArtifact registry role to assume", () => {
    // GIVEN
    const project = new TestProject();
    const roleArn = "role-arn";

    // WHEN
    const npm = new NodePackage(project, {
      npmRegistryUrl:
        "https://my-domain-111122223333.d.codeartifact.us-west-2.amazonaws.com/npm/my_repo/",
      codeArtifactOptions: {
        roleToAssume: roleArn,
      },
    });

    // THEN
    expect(npm.codeArtifactOptions?.roleToAssume).toStrictEqual(roleArn);
  });

  test("deprecated npmRegistry can be used instead of npmRegistryUrl and then https:// is assumed", () => {
    // GIVEN
    const project = new TestProject();

    // WHEN
    const npm = new NodePackage(project, {
      packageName: "scoped@my-package",
      npmRegistry: "foo.bar.com",
    });

    // THEN
    expect(npm.npmRegistry).toStrictEqual("foo.bar.com");
    expect(npm.npmRegistryUrl).toStrictEqual("https://foo.bar.com/");
    expect(packageJson(project).publishConfig).toStrictEqual({
      registry: "https://foo.bar.com/",
    });
  });
});

test("extend github release workflow", () => {
  const project = new TestNodeProject();

  project.release?.addJobs({
    publish_docker_hub: {
      permissions: {
        contents: JobPermission.READ,
      },
      runsOn: ["ubuntu-latest"],
      env: {
        CI: "true",
      },
      steps: [
        {
          name: "Check out the repo",
          uses: "actions/checkout@v2",
        },
        {
          name: "Push to Docker Hub",
          uses: "docker/build-push-action@v1",
          with: {
            username: "${{ secrets.DOCKER_USERNAME }}",
            password: "${{ secrets.DOCKER_PASSWORD }}",
            repository: "projen/projen-docker",
            tag_with_ref: "true",
          },
        },
      ],
    },
  });

  const workflow = synthSnapshot(project)[".github/workflows/release.yml"];
  expect(workflow).toContain(
    "publish_docker_hub:\n    runs-on: ubuntu-latest\n"
  );
  expect(workflow).toContain(
    "username: ${{ secrets.DOCKER_USERNAME }}\n          password: ${{ secrets.DOCKER_PASSWORD }}"
  );
});

describe("scripts", () => {
  test("addTask and setScript", () => {
    const p = new TestNodeProject();
    p.addTask("chortle", { exec: 'echo "frabjous day!"' });
    p.setScript("slithy-toves", "gyre && gimble");
    const pkg = packageJson(p);
    expect(pkg.scripts).toHaveProperty("chortle");
    expect(pkg.scripts).toHaveProperty("slithy-toves");
  });

  test("removeScript will remove tasks and scripts", () => {
    const p = new TestNodeProject();

    p.addTask("chortle", { exec: 'echo "frabjous day!"' });
    p.setScript("slithy-toves", "gyre && gimble");
    p.removeScript("chortle");
    p.removeScript("slithy-toves");
    const pkg = packageJson(p);
    expect(pkg.scripts).not.toHaveProperty("chortle");
    expect(pkg.scripts).not.toHaveProperty("slithy-toves");
  });
});

test("mutableBuild will push changes to PR branches", () => {
  // WHEN
  const project = new TestNodeProject({
    mutableBuild: true,
  });

  // THEN
  const workflowYaml = synthSnapshot(project)[".github/workflows/build.yml"];
  const workflow = yaml.parse(workflowYaml);
  expect(workflow.jobs.build.steps).toMatchSnapshot();
  expect(Object.keys(workflow.jobs)).toContain("self-mutation");
  expect(workflow.jobs["self-mutation"].steps).toMatchSnapshot();
});

test("disabling mutableBuild will skip pushing changes to PR branches", () => {
  // WHEN
  const project = new TestNodeProject({
    mutableBuild: false,
  });

  // THEN
  const workflowYaml = synthSnapshot(project)[".github/workflows/build.yml"];
  const workflow = yaml.parse(workflowYaml);
  expect(workflow.jobs.build.steps).toMatchSnapshot();
  expect(Object.keys(workflow.jobs)).not.toContain("self-mutation");
});

test("projen synth is only executed for subprojects", () => {
  // GIVEN
  const root = new TestNodeProject();

  // WHEN
  new TestNodeProject({ parent: root, outdir: "child" });

  // THEN
  const snapshot = synthSnapshot(root);
  const rootBuildTask = snapshot[".projen/tasks.json"].tasks.build;
  const childBuildTask = snapshot["child/.projen/tasks.json"].tasks.build;
  expect(rootBuildTask).toStrictEqual({
    description: "Full release build",
    name: "build",
    steps: [
      { spawn: "default" },
      { spawn: "pre-compile" },
      { spawn: "compile" },
      { spawn: "post-compile" },
      { spawn: "test" },
      { spawn: "package" },
    ],
  });
  expect(childBuildTask).toStrictEqual({
    description: "Full release build",
    name: "build",
    steps: [
      { spawn: "pre-compile" },
      { spawn: "compile" },
      { spawn: "post-compile" },
      { spawn: "test" },
      { spawn: "package" },
    ],
  });
});

test("enabling dependabot does not overturn mergify: false", () => {
  // WHEN
  const project = new TestNodeProject({
    dependabot: true,
    mergify: false,
  });

  // THEN
  const snapshot = synthSnapshot(project);
  // Note: brackets important, they prevent "." in filenames to be interpreted
  //       as JSON object path delimiters.
  expect(snapshot).not.toHaveProperty([".mergify.yml"]);
  expect(snapshot).toHaveProperty([".github/dependabot.yml"]);
});

test("github: false disables github integration", () => {
  // WHEN
  const project = new TestNodeProject({
    github: false,
    autoApproveUpgrades: true,
    autoApproveOptions: {},
  });

  // THEN
  const output = synthSnapshot(project);
  expect(
    Object.keys(output).filter((p) => p.startsWith(".github/"))
  ).toStrictEqual([]);
});

test("githubOptions.workflows:false disables github workflows but not github integration", () => {
  // WHEN
  const project = new TestNodeProject({
    githubOptions: {
      workflows: false,
    },
  });

  // THEN
  const output = synthSnapshot(project);
  expect(
    Object.keys(output).filter((p) => p.startsWith(".github/"))
  ).toStrictEqual([".github/pull_request_template.md"]);
});

test("using GitHub npm registry will default npm secret to GITHUB_TOKEN", () => {
  // GIVEN
  const project = new TestNodeProject({
    npmRegistryUrl: "https://npm.pkg.github.com",
  });

  // THEN
  const output = synthSnapshot(project);
  expect(output[".github/workflows/release.yml"]).not.toMatch("NPM_TOKEN");
});

function packageJson(project: Project) {
  return synthSnapshot(project)["package.json"];
}

test("buildWorkflow can use GitHub App for API access", () => {
  // GIVEN
  const appId = "APP_ID";
  const privateKey = "PRIVATE_KEY";
  const project = new TestNodeProject({
    githubOptions: {
      projenCredentials: GithubCredentials.fromApp({
        appIdSecret: appId,
        privateKeySecret: privateKey,
      }),
    },
  });

  // THEN
  const output = synthSnapshot(project);
  const buildWorkflow = yaml.parse(output[".github/workflows/build.yml"]);
  expect(buildWorkflow.jobs["self-mutation"].steps[0]).toMatchObject({
    name: "Generate token",
    with: {
      app_id: `\${{ secrets.${appId} }}`,
      private_key: `\${{ secrets.${privateKey} }}`,
    },
  });
  expect(buildWorkflow.jobs["self-mutation"].steps[1]).toMatchObject({
    name: "Checkout",
    with: {
      token: "${{ steps.generate_token.outputs.token }}",
    },
  });
});

test("workflowGitIdentity can be used to customize the git identity used in build workflows", () => {
  // GIVEN
  const project = new TestNodeProject({
    workflowGitIdentity: {
      name: "heya",
      email: "there@z.com",
    },
  });

  // THEN
  const output = synthSnapshot(project);
  const buildWorkflow = yaml.parse(output[".github/workflows/build.yml"]);
  expect(buildWorkflow.jobs["self-mutation"].steps[3]).toStrictEqual({
    name: "Set git identity",
    run: [
      'git config user.name "heya"',
      'git config user.email "there@z.com"',
    ].join("\n"),
  });
});

describe("workflowRunsOn", () => {
  test("default to ubuntu-latest", () => {
    // WHEN
    const project = new TestNodeProject();

    // THEN
    const output = synthSnapshot(project);
    const buildWorkflow = yaml.parse(output[".github/workflows/build.yml"]);
    expect(buildWorkflow.jobs.build["runs-on"]).toEqual("ubuntu-latest");
    expect(buildWorkflow.jobs["self-mutation"]["runs-on"]).toEqual(
      "ubuntu-latest"
    );
  });

  test("use github runner specified in workflowRunsOn", () => {
    // WHEN
    const project = new TestNodeProject({
      workflowRunsOn: ["self-hosted"],
    });

    // THEN
    const output = synthSnapshot(project);
    const buildWorkflow = yaml.parse(output[".github/workflows/build.yml"]);
    expect(buildWorkflow.jobs.build["runs-on"]).toEqual("self-hosted");
    expect(buildWorkflow.jobs["self-mutation"]["runs-on"]).toEqual(
      "self-hosted"
    );
  });
});

describe("buildWorkflowTriggers", () => {
  test("default to pull request and workflow dispatch", () => {
    // WHEN
    const project = new TestNodeProject();

    // THEN
    const output = synthSnapshot(project);
    const buildWorkflow = yaml.parse(output[".github/workflows/build.yml"]);
    expect(buildWorkflow.on).toEqual({
      pull_request: {},
      workflow_dispatch: {},
    });
  });

  test("use custom triggers in build workflow", () => {
    // WHEN
    const project = new TestNodeProject({
      buildWorkflowTriggers: {
        push: {
          branches: ["feature/*"],
        },
      },
    });

    // THEN
    const output = synthSnapshot(project);
    const buildWorkflow = yaml.parse(output[".github/workflows/build.yml"]);
    expect(buildWorkflow.on).toEqual({
      push: {
        branches: ["feature/*"],
      },
    });
  });
});

test("post-upgrade workflow", () => {
  // GIVEN
  const project = new TestNodeProject();

  // THEN
  const snapshot = synthSnapshot(project);
  const tasks = snapshot[TaskRuntime.MANIFEST_FILE].tasks;
  expect(tasks.upgrade.steps[tasks.upgrade.steps.length - 1]).toStrictEqual({
    spawn: "post-upgrade",
  });
});

test("node project can be ejected", () => {
  // GIVEN
  // equivalent to running "eject" task - needs to be enabled at construction time
  process.env.PROJEN_EJECTING = "true";

  // WHEN
  const p = new TestNodeProject();
  p.deps.addDependency("test", DependencyType.BUILD);
  new JsonFile(p, "foo/bar.json", { obj: { hello: "world!" } });
  new SampleFile(p, "sample.txt", {
    contents: "the file",
  });

  // THEN
  const outdir = synthSnapshot(p);
  expect(outdir["package.json"]).toMatchSnapshot();
  expect(outdir["package.json"]).not.toContain(PROJEN_MARKER);
  expect(outdir["package.json"]["//"]).toBeUndefined();
  expect(outdir["package.json"].scripts.eject).toBeUndefined();
  expect(outdir["package.json"].scripts.default).toBeUndefined();
  expect(outdir["package.json"].devDependencies.projen).toBeUndefined();
  expect(outdir["scripts/run-task"]).toBeDefined();
  expect(outdir["foo/bar.json"]).not.toContain(PROJEN_MARKER);
  expect(outdir["sample.txt"]).not.toContain(PROJEN_MARKER);
  expect(outdir[".projenrc.js"]).toBeUndefined();
  expect(outdir[".projen/deps.json"]).toBeUndefined();
  expect(outdir[".projen/files.json"]).toBeUndefined();
});

class TestNodeProject extends NodeProject {
  constructor(options: Partial<NodeProjectOptions> = {}) {
    super({
      name: "test-node-project",
      defaultReleaseBranch: "main",
      ...options,
    });
  }
}
