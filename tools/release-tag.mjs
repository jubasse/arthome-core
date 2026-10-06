const TAG = /^v(\d+\.\d+\.\d+)(?:-rc\.(\d+))?$/;

export function parseReleaseTag(tag) {
  const match = TAG.exec(tag);
  if (!match) {
    throw new Error(
      `"${tag}" is neither v<major>.<minor>.<patch> nor v<major>.<minor>.<patch>-rc.<n>`,
    );
  }
  const [, base, candidate] = match;
  return {
    base,
    version: candidate ? `${base}-rc.${candidate}` : base,
    isCandidate: candidate !== undefined,
  };
}

export function releaseOf(tag, packageVersion) {
  const release = parseReleaseTag(tag);
  if (release.base !== packageVersion) {
    throw new Error(`the packages are at ${packageVersion}, the tag says ${release.base}`);
  }
  return release;
}
