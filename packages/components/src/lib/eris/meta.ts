/** Registry metadata each component exports. registry-build turns these into registry-item JSON. */
export interface RegistryMeta {
  name: string;
  type: "registry:ui" | "registry:lib" | "registry:style";
  title: string;
  description: string;
  /** npm packages the user's project needs. */
  dependencies?: string[];
  /** Other Eris registry items installed first. */
  registryDependencies?: string[];
  /** Files relative to packages/components/src. */
  files: string[];
  status: "stable" | "beta";
}
