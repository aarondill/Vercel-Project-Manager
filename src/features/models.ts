/* eslint-disable @typescript-eslint/naming-convention */
// 👆 because vercel API requires ALLCAP keys

export type Meta<T extends Provider> = {
	[K in MetaKeys<T>]: string;
};

type Provider = "bitbucket" | "github" | "gitlab";
type MetaStates =
	| "CommitAuthorName"
	| "CommitMessage"
	| "CommitOrg"
	| "CommitRef"
	| "CommitRepo"
	| "CommitRepoId"
	| "CommitSha"
	| "Deployment"
	| "Org"
	| "Repo"
	| "RepoId"
	| "CommitAuthorLogin";
type MetaKeys<T extends Provider> = `${T}${MetaStates}`;

export type Deployment = {
	/** The unique identifier of the deployment. */
	uid: string;
	/** The name of the deployment. */
	name: string;
	/** The URL of the deployment. */
	url: string;
	/** Timestamp of when the deployment got created. */
	created: number;
	/** The source of the deployment. */
	source?: "cli" | "git" | "import" | "import/repo" | "clone/repo";
	/** In which state is the deployment. */
	state?:
		| "BUILDING"
		| "ERROR"
		| "INITIALIZING"
		| "QUEUED"
		| "READY"
		| "CANCELED";
	/** The type of the deployment. */
	type: "LAMBDAS";
	/** Metadata information of the user who created the deployment. */
	creator: {
		/** The unique identifier of the user. */
		uid: string;
		/** The email address of the user. */
		email?: string;
		/** The username of the user. */
		username?: string;
		/** The GitHub login of the user. */
		githubLogin?: string;
		/** The GitLab login of the user. */
		gitlabLogin?: string;
	};
	/** Metadata information from the Git provider. */
	meta?: Meta<Provider>;
	/** On which environment has the deployment been deployed to. */
	target?: ("production" | "staging") | null;
	/** An error object in case aliasing of the deployment failed. */
	aliasError?: {
		code: string;
		message: string;
	} | null;
	aliasAssigned?: (number | boolean) | null;
	/** Timestamp of when the deployment got created. */
	createdAt?: number;
	/** Timestamp of when the deployment started building at. */
	buildingAt?: number;
	/** Timestamp of when the deployment got ready. */
	ready?: number;
	/** State of all registered checks */
	checksState?: "registered" | "running" | "completed";
	/** Conclusion for checks */
	checksConclusion?: "succeeded" | "failed" | "skipped" | "canceled";
	/** Vercel URL to inspect the deployment. */
	inspectorUrl: string | null;
	/** Deployment can be used for instant rollback */
	isRollbackCandidate?: boolean | null;
};

type Pagination = {
	count: number; //Amount of items in the current page.
	next: number; //Timestamp that must be used to request the next page.
	prev: number; //Timestamp that must be used to request the previous page.
};
type targets =
	| ("production" | "preview" | "development" | "preview" | "development")[]
	| ("production" | "preview" | "development" | "preview" | "development");

export type VercelEnvironmentInformation = {
	target?: targets;
	type?: "secret" | "system" | "encrypted" | "plain";
	id?: string;
	key?: string;
	value?: string;
	configurationId?: string | null;
	createdAt?: number;
	updatedAt?: number;
	createdBy?: string | null;
	updatedBy?: string | null;
	gitBranch?: string;
	edgeConfigId?: string | null;
	edgeConfigTokenId?: string | null;
	/** Whether `value` is decrypted. */
	decrypted?: boolean;
	/** Does not exist in some cases */
	system?: boolean;
};
export namespace VercelResponse {
	export type error = {
		error?: {
			code: string;
			message: string;
		};
	};
	export type deployment = {
		pagination: Pagination;
		deployments: Deployment[];
	};
	export namespace environment {
		export type getAll =
			| VercelEnvironmentInformation
			| { envs: VercelEnvironmentInformation[]; pagination: Pagination }
			| { envs: VercelEnvironmentInformation[] };
		export type edit = VercelEnvironmentInformation;
		export type create =
			| VercelEnvironmentInformation[]
			| VercelEnvironmentInformation;
		export type remove = create;
	}
	export namespace info {
		export type project = {
			accountId: string;
			analytics?: VercelAnalyticsObject;
			autoExposeSystemEnvs?: boolean;
			buildCommand?: string | null;
			commandForIgnoringBuildStep?: string | null;
			createdAt?: number;
			devCommand?: string | null;
			directoryListing: boolean;
			installCommand?: string | null;
			env?: VercelEnvironmentInformation[];
			framework?: string | null;
			gitForkProtection?: boolean;
			id: string;
			latestDeployments?: VercelDeploymentInfo[];
			link?: VercelProjectLink;
			name: string;
			nodeVersion: "18.x" | "16.x" | "14.x" | "12.x" | "10.x";
			outputDirectory?: string | null;
			passwordProtection?: {
				deploymentType: "preview" | "all";
			} | null;
			publicSource?: boolean | null;
			rootDirectory?: string | null;
			serverlessFunctionRegion?: string | null;
			skipGitConnectDuringLink?: boolean;
			sourceFilesOutsideRootDirectory?: boolean;
			ssoProtection?: {
				deploymentType: "preview" | "all";
			} | null;
			/** An object containing the deployment's metadata */
			targets?: { [key: string]: string };
			transferCompletedAt?: number;
			transferStartedAt?: number;
			transferToAccountId?: string;
			transferredFromAccountId?: string;
			updatedAt?: number;
			live?: boolean;
			enablePreviewFeedback?: boolean | null;
			/** Some things go here */
			permissions?: {};
			lastRollbackTarget?: {
				fromDeploymentId: string;
				toDeploymentId: string;
				jobStatus:
					| "succeeded"
					| "failed"
					| "skipped"
					| "pending"
					| "in-progress";
				requestedAt: number;
			} | null;
			hasFloatingAliases?: boolean;
			/** Construct a type with a set of properties K of type T */
			protectionBypass?: { [key: string]: string };
		};
		/** Data for the currently authenticated User. */
		export type user = {
			/** UNIX timestamp (in milliseconds) when the User account was created. */
			createdAt: number;
			/** When the User account has been "soft blocked", this property will contain the date when the restriction was enacted, and the identifier for why. */
			softBlock: {
				blockedAt: number;
				reason:
					| "FAIR_USE_LIMITS_EXCEEDED"
					| "ENTERPRISE_TRIAL_ENDED"
					| "BLOCKED_FOR_PLATFORM_ABUSE"
					| "UNPAID_INVOICE"
					| "SUBSCRIPTION_EXPIRED"
					| "SUBSCRIPTION_CANCELED";
			} | null;
			/** An object containing billing infomation associated with the User account. */
			billing: {
				currency?: "usd" | "eur";
				addons?: ("custom-deployment-suffix" | "live-support")[] | null;
				cancelation?: number | null;
				period: {
					start: number;
					end: number;
				} | null;
				contract?: {
					start: number;
					end: number;
				} | null;
				plan: "hobby" | "enterprise" | "pro";
				platform?: "stripe" | "stripeTestMode";
				programType?: "startup" | "agency";
				trial?: {
					start: number;
					end: number;
				} | null;
				email?: string | null;
				tax?: {
					type: string;
					id: string;
				} | null;
				language?: string | null;
				address?: {
					line1: string;
					line2?: string;
					postalCode?: string;
					city?: string;
					country?: string;
					state?: string;
				} | null;
				name?: string | null;
				overdue?: boolean | null;
				invoiceItems?: {
					/** Will be used to create an invoice item. The price must be in cents: 2000 for $20. */
					pro?: {
						price: number;
						quantity: number;
						name?: string;
						hidden: boolean;
						createdAt?: number;
						frequency?: {
							interval: "month";
							intervalCount: 1 | 3 | 2 | 6 | 12;
						};
					};
					/** Will be used to create an invoice item. The price must be in cents: 2000 for $20. */
					enterprise?: {
						price: number;
						quantity: number;
						name?: string;
						hidden: boolean;
						createdAt?: number;
						frequency?: {
							interval: "month";
							intervalCount: 1 | 3 | 2 | 6 | 12;
						};
					};
					/** Will be used to create an invoice item. The price must be in cents: 2000 for $20. */
					concurrentBuilds?: {
						price: number;
						quantity: number;
						name?: string;
						hidden: boolean;
						createdAt?: number;
						frequency?: {
							interval: "month";
							intervalCount: 1 | 3 | 2 | 6 | 12;
						};
					};
					/** Will be used to create an invoice item. The price must be in cents: 2000 for $20. */
					saml?: {
						price: number;
						quantity: number;
						name?: string;
						hidden: boolean;
						createdAt?: number;
						frequency?: {
							interval: "month";
							intervalCount: 1 | 3 | 2 | 6 | 12;
						};
					};
					/** Will be used to create an invoice item. The price must be in cents: 2000 for $20. */
					teamSeats?: {
						price: number;
						quantity: number;
						name?: string;
						hidden: boolean;
						createdAt?: number;
						frequency?: {
							interval: "month";
							intervalCount: 1 | 3 | 2 | 6 | 12;
						};
					};
					/** Will be used to create an invoice item. The price must be in cents: 2000 for $20. */
					customCerts?: {
						price: number;
						quantity: number;
						name?: string;
						hidden: boolean;
						createdAt?: number;
						frequency?: {
							interval: "month";
							intervalCount: 1 | 3 | 2 | 6 | 12;
						};
					};
					/** Will be used to create an invoice item. The price must be in cents: 2000 for $20. */
					previewDeploymentSuffix?: {
						price: number;
						quantity: number;
						name?: string;
						hidden: boolean;
						createdAt?: number;
						frequency?: {
							interval: "month";
							intervalCount: 1 | 3 | 2 | 6 | 12;
						};
					};
					/** Will be used to create an invoice item. The price must be in cents: 2000 for $20. */
					passwordProtection?: {
						price: number;
						quantity: number;
						name?: string;
						hidden: boolean;
						createdAt?: number;
						frequency?: {
							interval: "month";
							intervalCount: 1 | 3 | 2 | 6 | 12;
						};
					};
					/** Will be used to create an invoice item. The price must be in cents: 2000 for $20. */
					ssoProtection?: {
						price: number;
						quantity: number;
						name?: string;
						hidden: boolean;
						createdAt?: number;
						frequency?: {
							interval: "month";
							intervalCount: 1 | 3 | 2 | 6 | 12;
						};
					};
					/** Will be used to create an invoice item. The price must be in cents: 2000 for $20. */
					analytics?: {
						price: number;
						quantity: number;
						name?: string;
						hidden: boolean;
						createdAt?: number;
						frequency?: {
							interval: "month";
							intervalCount: 1 | 3 | 2 | 6 | 12;
						};
					};
					analyticsUsage?: {
						price: number;
						batch: number;
						threshold: number;
						name?: string;
						hidden: boolean;
					};
					artifacts?: {
						price: number;
						batch: number;
						threshold: number;
						name?: string;
						hidden: boolean;
					};
					bandwidth?: {
						price: number;
						batch: number;
						threshold: number;
						name?: string;
						hidden: boolean;
					};
					builds?: {
						price: number;
						batch: number;
						threshold: number;
						name?: string;
						hidden: boolean;
					};
					edgeMiddlewareInvocations?: {
						price: number;
						batch: number;
						threshold: number;
						name?: string;
						hidden: boolean;
					};
					serverlessFunctionExecution?: {
						price: number;
						batch: number;
						threshold: number;
						name?: string;
						hidden: boolean;
					};
					sourceImages?: {
						price: number;
						batch: number;
						threshold: number;
						name?: string;
						hidden: boolean;
					};
				} | null;
				invoiceSettings?: {
					footer?: string;
				};
				subscriptions?:
					| {
							id: string;
							trial: {
								start: number;
								end: number;
							} | null;
							period: {
								start: number;
								end: number;
							};
							frequency: {
								interval: "month" | "day" | "week" | "year";
								intervalCount: number;
							};
							discount: {
								id: string;
								coupon: {
									id: string;
									name: string | null;
									amountOff: number | null;
									percentageOff: number | null;
									durationInMonths: number | null;
									duration: "forever" | "repeating" | "once";
								};
							} | null;
							items: {
								id: string;
								priceId: string;
								productId: string;
								amount: number;
								quantity: number;
							}[];
					  }[]
					| null;
				controls?: {
					analyticsSampleRateInPercent?: number | null;
					analyticsSpendLimitInDollars?: number | null;
				} | null;
				purchaseOrder?: string | null;
				status?: "active" | "canceled" | "trialing" | "overdue" | "expired";
				pricingExperiment?: "august-2022";
			} | null;
			/** An object containing infomation related to the amount of platform resources may be allocated to the User account. */
			resourceConfig: {
				nodeType?: string;
				concurrentBuilds?: number;
				awsAccountType?: string;
				awsAccountIds?: string[];
				cfZoneName?: string;
			};
			/** Prefix that will be used in the URL of "Preview" deployments created by the User account. */
			stagingPrefix: string;
			/** set of dashboard view preferences (cards or list) per scopeId */
			activeDashboardViews?: {
				scopeId: string;
				viewPreference: "cards" | "list";
			}[];
			importFlowGitNamespace?: (string | number) | null;
			importFlowGitNamespaceId?: (string | number) | null;
			importFlowGitProvider?: "github" | "gitlab" | "bitbucket";
			preferredScopesAndGitNamespaces?: {
				scopeId: string;
				gitNamespaceId: (string | number) | null;
			}[];
			/** A record of when, under a certain scopeId, a toast was dismissed */
			dismissedToasts?: {
				name: string;
				dismissals: {
					scopeId: string;
					createdAt: number;
				}[];
			}[];
			/** Whether the user has a trial available for a paid plan subscription. */
			hasTrialAvailable: boolean;
			/** remote caching settings */
			remoteCaching?: {
				enabled?: boolean;
			};
			/** The User's unique identifier. */
			id: string;
			/** Email address associated with the User account. */
			email: string;
			/** Name associated with the User account, or `null` if none has been provided. */
			name: string | null;
			/** Unique username associated with the User account. */
			username: string;
			/** SHA1 hash of the avatar for the User account. Can be used in conjuction with the ... endpoint to retrieve the avatar image. */
			avatar: string | null;
		};
	}
}
/** @memberof VercelResponse.info.project */
type VercelAnalyticsObject = {
	id: string;
	canceledAt: number | null;
	disabledAt: number;
	enabledAt: number;
	paidAt?: number;
	sampleRatePercent?: number | null;
	spendLimitInDollars?: number | null;
};

/** @memberof VercelResponse.info.project */
type VercelDeploymentInfo = {
	alias?: string[];
	aliasAssigned?: (number | boolean) | null;
	aliasError?: {
		code: string;
		message: string;
	} | null;
	aliasFinal?: string | null;
	automaticAliases?: string[];
	builds?: {
		use: string;
		src?: string;
		dest?: string;
	}[];
	createdAt: number;
	createdIn: string;
	creator: {
		email: string;
		githubLogin?: string;
		gitlabLogin?: string;
		uid: string;
		username: string;
	} | null;
	deploymentHostname: string;
	name: string;
	forced?: boolean;
	id: string;
	/** Construct a type with a set of properties K of type T */
	meta?: { [key: string]: string };
	monorepoManager?: string | null;
	plan: string;
	private: boolean;
	readyState: string;
	requestedAt?: number;
	target?: string | null;
	teamId?: string | null;
	type: string;
	url: string;
	userId: string;
	withCache?: boolean;
	checksConclusion?: "succeeded" | "failed" | "skipped" | "canceled";
	checksState?: "registered" | "running" | "completed";
	readyAt?: number;
	buildingAt?: number;
};

/** @memberof VercelResponse.info.project */
type VercelProjectLink =
	| {
			org?: string;
			repo?: string;
			repoId?: number;
			type?: "github";
			createdAt?: number;
			deployHooks: {
				createdAt?: number;
				id: string;
				name: string;
				ref: string;
				url: string;
			}[];
			gitCredentialId?: string;
			updatedAt?: number;
			sourceless?: boolean;
			productionBranch?: string;
	  }
	| {
			projectId?: string;
			projectName?: string;
			projectNameWithNamespace?: string;
			projectNamespace?: string;
			projectUrl?: string;
			type?: "gitlab";
			createdAt?: number;
			deployHooks: {
				createdAt?: number;
				id: string;
				name: string;
				ref: string;
				url: string;
			}[];
			gitCredentialId?: string;
			updatedAt?: number;
			sourceless?: boolean;
			productionBranch?: string;
	  }
	| {
			name?: string;
			slug?: string;
			owner?: string;
			type?: "bitbucket";
			uuid?: string;
			workspaceUuid?: string;
			createdAt?: number;
			deployHooks: {
				createdAt?: number;
				id: string;
				name: string;
				ref: string;
				url: string;
			}[];
			gitCredentialId?: string;
			updatedAt?: number;
			sourceless?: boolean;
			productionBranch?: string;
	  };
