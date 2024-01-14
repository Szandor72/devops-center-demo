# Salesforce DevOps Center Demo Project

## What is this?

This Demo Project has 3 dimensions:

1. It is a sample project to demonstrate how Salesforce DevOps Center can be used together with
   re-usable GitHub Actions and additional Salesforce tools to build a **loosely coupled **CI**
   pipeline** with automated Quality Gates.
2. It acknowledges projects contain **legacy** (read: older, bad quality) **metadata** which should be scanned and reported but not block or confuse new development
3. It shows that **App Builders don't need to use VS Code**, or any IDE, or the Command Line to get the same benefits as Developers do.

## Loosely coupled how?

Imagine for a moment, you have created - over time - a dozen Salesforce projects, each with their
own CI yml files, ignore files, and so on. Now imagine you want to make a change to all of them. You
could go through each repository and make the change, but that's a lot of work. Instead, you could
make a change in one place, and have all of your projects automatically use the updated version.

## What are common moving parts that need loose coupling?

A Salesforce Project is tooling-wise a web development/JavaScript project with very few extra bells
and whistles. The default DX Project setup relies on a node `package.json` for tooling like ESLint,
Jest, or Prettier. Each tools comes with its own config and rule files as well as ignore file
options.

Then you have your actual CI worfklow configuration file(s) which have dependencies to the SF CLI,
Orgs and Authentication, Caching, and additional tools like PMD or the SFDX Scanner plugin.

These tools come with config and rulesets of their own.

## What will it do?

All [checks](https://github.com/Szandor72/devops-center-demo/actions) run on **Pull Request**
against `integration` branch for changes in the `force-app` folder.

An integration sandbox is supposed to be the target org.

Three workflows are configured:

- **validate-metadata**

  - SFDX Scanner with PMD engine and custom rules for
    - sObjects
    - Flows
    - Misc Metadata
  - only new/modified files will be prettified (3rd Party Action)

- **validate-code**

  - Jest Tests
  - SFDX Scanner
    - all modified files will be checked whether they have a match in
      `.ci/legacy-metadata-files.txt`
    - for modified legacy files
      - only code will be scanned
      - the build will never fail if issues are found
      - Issues are reported in markdown table as step summary as well as
      - CSV upload to a target org (get a notification in the org optionally)
      - CSV upload is only triggered if new issues are detected upon re-rerun of a scan per
        PR
    - for all other files (new and modified)
      - strict code scans are performed

- **validate-deployment**

  - runs a test deployment against integration sandbox and runs all local tests

## How does it work?

There are several repositories involved:

- https://github.com/Szandor72/devops-center-template
  - an empty DX project with no config files. Use this as starting point in DevOps Center or
    create your own fork
- https://github.com/Szandor72/devops-center-demo
  - a copy of the template with a bit of Salesforce Metadata and all
    [Actions configured](https://github.com/Szandor72/devops-center-demo/actions) and minimal
    [workflow files](https://github.com/Szandor72/devops-center-demo/tree/main/.github/workflows).
    All secrets for authentication are stored here and passed on to:
- https://github.com/Szandor72/devops-center-actions
  - this repository stores all the GitHub Actions that are used in the demo project. It can
    "inherit" secrets from the Demo Repo because GitHub Actions can access secrets from the same
    GitHub organization.
- https://github.com/Szandor72/devops-center-local-config-files
  - is [a npm package ](https://www.npmjs.com/package/devops-center-local-config-files) which
    contains all the config files as well as (exemplary, strict, custom) PMD
    [rulesets](https://github.com/Szandor72/devops-center-local-config-files/tree/main/pmd-rulesets)
    for various metadata types and code.
  - The config files and rulesets are intended to be copied and used only during build time by
    the GitHub Actions Workflows.
  - If you run **`npm install` locally**, the files will be copied as well. If you commit your
    copies, these files will be used instead of the ones from the npm package.
  - The npm package also provides a few
    [JavaScript files](https://github.com/Szandor72/devops-center-local-config-files/tree/main/ci-scripts)
    that help preparing scans and parsing scan results by generating GitHub Annotations and
    summary tables.

## How can I use it?

- Create a fork of the template repository and use it as starting point in DevOps Center
- Make sure to activate Actions, those aren't enabled by default when forking
- Configure the Actions to use your own Orgs and Secrets
  - `${{ secrets.INTEGRATION_SANDBOX_SFDX_URL}}` will be used to do test deployments and CSV Scan Report File Upload
- GitHub Action workflows are configured to run when a PR against `integration` branch is opened
  - Please make sure the `integration` branch exists

## Todos

- figure out how to cache yarn plugins (SFDX Scanner) or wait for Scanner GH Action to be released
