interface SandboxOptions {
    /**
     * A token derived from your master token or a JWT token accepted by Extend server if you are using Security V2.
     */
    token: string,
    /**
     * The container with which this Sandbox instance should be associated.
     */
    container: string,
    /**
     * [optional] The URL of the webtask cluster. Defaults to the public 'webtask.it.auth0.com' cluster.
     */
    url?: string
  }

  interface SandboxMethodOptions {
    /**
     * The name of the webtask.
     */
    name: string,
    /**
     * [optional] Set the webtask container. Defaults to the profile's container.
     */
    container?: string
  }

  interface GetWebtaskOptions extends SandboxMethodOptions {
    /**
     * [optional] Decrypt the webtask's secrets.
     */
    decrypt?: boolean,
    /**
     * [optional] Fetch the code associated with the webtask.
     */
    fetch_code?: boolean
  }

  interface CreateWebtaskOptions extends SandboxMethodOptions {
    /**
     * Set the webtask secrets.
     */
    secrets: object,
    /**
     * Set the webtask metadata.
     */
    meta: object,
    /**
     * Set the webtask hostname.
     */
    host: string
  }

  interface RemoveWebtaskOptions extends SandboxMethodOptions { }

  interface ListWebtasksOptions {
    /**
     * [optional] Set the webtask container. Defaults to the profile's container.
     */
    container?: string,
    /**
     * [optional] Metadata describing the webtask. This is a set of string key value pairs. Only webtasks with matching metadata will be returned.
     */
    meta?: object,
    /**
     * [optional] Skip this many named webtasks
     */
    offset?: number,
    /**
     * [optional] Limit the results to this many named webtasks.
     */
    limit?: number
  }

  interface CreateCronJobOptions extends SandboxMethodOptions {
    /**
     * The name of the cron job.
     */
    name: string,
    /**
     * [optional] The webtask token that will be used to run the job.
     */
    token?: string,
    /**
     * The cron schedule that will be used to determine when the job will be run. For example: '5 4 * * *'.
     */
    schedule: string,
    /**
     * The cron timezone (IANA timezone).
     */
    tz: string,
    /**
     * The cron metadata (set of string key value pairs).
     */
    meta: string
  }

  interface RemoveCronJobOptions extends SandboxMethodOptions {
    /**
     * The name of the cron job.
     */
    name: string
  }

  interface SetCronJobStateOptions extends SandboxMethodOptions {
    /**
     * The name of the cron job.
     */
    name: string,
    /**
     * The new state of the cron job (active/inactive).
     */
    state: string
  }

  interface ListCronJobsOptions {
    /**
     * [optional] Set the webtask container. Defaults to the profile's container.
     */
    container?: string
  }

  interface GetCronJobOptions extends SandboxMethodOptions {
    /**
     * The name of the cron job.
     */
    name: string,
  }

  interface GetCronJobHistoryOptions extends SandboxMethodOptions {
    /**
     * The name of the cron job.
     */
    name: string,
    /**
     * [optional] The offset to use when paging through results.
     */
    offset?: number,
    /**
     * [optional] The limit to use when paging through results.
     */
    limit?: number
  }

  interface RevokeTokenOptions {
    /**
     * The token that should be revoked
     */
    token: string
  }

  interface ListNodeModuleVersionsOptions {
    /**
     * Name of the node module
     */
    name: string
  }

  interface EnsureNodeModulesOptions {
    /**
     * Array of { name, version } pairs
     */
    modules: object[],
    /**
     * Trigger a rebuild of the modules (Requires administrative token)
     */
    reset: boolean
  }

  interface WebtaskStorage {
    /**
     * The data to be stored
     */
    data: object,
    /**
     * [optional] Pass in an optional string to be used for optimistic concurrency control to prevent simultaneous updates of the same data.
     */
    etag?: number
  }

  interface UpdateStorageOptions extends SandboxMethodOptions {
    storage: WebtaskStorage
  }

  interface GetStorageOptions extends SandboxMethodOptions { }

  interface CreateLogStreamOptions {
    /**
     * Define if the data will shown as JSON or not.
     */
    json: boolean
  }

  interface SandboxResponseClaims {
    /** 
     * The name of the webtask
    */
    jtn: string,
    /** 
     * The container name
    */
    ten: string
  }

  interface GetWebtaskResponse {
    /** 
     * The claims which are part of the webtask
    */
    claims: SandboxResponseClaims,
    /** 
     * The meta associated to the webtask
    */
    meta: object,
    /** 
     * The secrets associated to the webtask (only if `decrypt: true`)
    */
    secrets: object,
    /** 
     * The code of the webtask (only if `fetch_code: true`)
    */
    code: string,
    /** 
     * The container name
    */
    container: string,
    /** 
     * The URL to execute the webtask
    */
    url: string
  }

  interface CreateWebtaskResponse {
    /** 
     * The claims which are part of the webtask
    */
    claims: SandboxResponseClaims,
    /** 
     * The meta associated to the webtask
    */
    meta: object,
    /** 
     * The secrets associated to the webtask (only if `decrypt: true`)
    */
    container: string,
    /** 
     * The URL to execute the webtask
    */
    url: string
  }

  interface ModuleResponse {
    /** 
     * The name of the module 
    */
    name: string,
    /** 
     * The version of the module
    */
    version: string,
    /** 
     * The state of the module (available, queued or failed)
    */
    state: string
    // "name": "express",
    // "version": "4.12.4",
    // "state": "available"
  }

  interface SandboxProfile {
    /**
     * [deprecated] Use 'createWebtask'.
     */
    create(options: object) : Promise<any>,

    /**
     * [deprecated] Use 'createWebtask'.
     */
    createRaw(options: object) : Promise<any>,

    /**
     * [deprecated] Use 'createWebtask'.
     */
    createUrl(options: object) : Promise<any>,

    /**
     * [deprecated] Use 'createWebtask'.
     */
    createTokenRaw(options: object) : Promise<any>,

    /**
     * Create a stream of logs from the webtask container
     *
     * Note that the logs will include messages from our infrastructure.
     */
    createLogStream(options: CreateLogStreamOptions) : any,

    /**
     * Read a named webtask
     */
    getWebtask(options: GetWebtaskOptions) : Promise<GetWebtaskResponse>,

    /**
     * Create a named webtask
     */
    createWebtask(options: CreateWebtaskOptions) : Promise<CreateWebtaskResponse>,

    /**
     * Remove a named webtask from the webtask container
     */
    removeWebtask(options: RemoveWebtaskOptions) : Promise<boolean>,

    /**
     * [deprecated] Update an existing webtask's code, secrets or other claims
     *
     * Note that this method should be used with caution as there is the potential for a race condition where another agent updates the webtask between the time that the webtask details and claims are resolved and when the webtask update is issued.
     */
    updateWebtask(options: object) : Promise<any>,

    /**
     * List named webtasks from the webtask container
     */
    listWebtasks(options: ListWebtasksOptions) : Promise<GetWebtaskResponse[]>,

    /**
     * Create a cron job from an already-existing webtask
     */
    createCronJob(options: CreateCronJobOptions) : Promise<any>,

    /**
     * Remove an existing cron job
     */
    removeCronJob(options: RemoveCronJobOptions) : Promise<any>,

    /**
     * Set an existing cron job's state
     */
    setCronJobState(options: SetCronJobStateOptions) : Promise<any>,

    /**
     * List cron jobs associated with this profile
     */
    listCronJobs(options: ListCronJobsOptions) : Promise<any>,

    /**
     * Get a CronJob instance associated with an existing cron job
     */
    getCronJob(options: GetCronJobOptions) : Promise<any>,

    /**
     * Get the historical results of executions of an existing cron job.
     */
    getCronJobHistory(options, GetCronJobHistoryOptions) : Promise<any>,

    /**
     * [deprecated] Use 'getWebtask'.
     */
    inspectToken(options: object) : Promise<any>,

    /**
     * [deprecated] Use 'getWebtask'.
     */
    inspectWebtask(options: object) : Promise<any>,

    /**
     * Revoke a webtask token
     */
    revokeToken(options: RevokeTokenOptions) : Promise<any>,

    /**
     * List versions of a given node module that are available on the platform
     */
    listNodeModuleVersions(options: ListNodeModuleVersionsOptions) : Promise<ModuleResponse[]>,

    /**
     * Ensure that a set of modules are available on the platform
     */
    ensureNodeModules(options: EnsureNodeModulesOptions) : Promise<ModuleResponse[]>,

    /**
     * Update the storage associated to the a webtask
     */
    updateStorage(options: UpdateStorageOptions) : Promise<any>,

    /**
     * Read the storage associated to the a webtask
     */
    getStorage(options: GetStorageOptions) : Promise<any>
  }

  declare var Sandbox: SandboxJS.SandboxStatic;

  declare module SandboxJS {
    interface SandboxStatic {
      /**
       * Create a Sandbox instance
       */
      init (options: SandboxOptions) : SandboxProfile,

      /**
       * [deprecated] Create a Sandbox instance from a webtask token
       */
      fromToken (token, options: SandboxOptions)
    }
  }

  declare module "sandboxjs" {
    export = Sandbox;
  }