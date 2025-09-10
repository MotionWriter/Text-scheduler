/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as _lib_adminAuth from "../_lib/adminAuth.js";
import type * as _lib_messageTypes from "../_lib/messageTypes.js";
import type * as _lib_userAuth from "../_lib/userAuth.js";
import type * as adminTest from "../adminTest.js";
import type * as allMessagesForStudyBook from "../allMessagesForStudyBook.js";
import type * as allScheduledMessages from "../allScheduledMessages.js";
import type * as api_ from "../api.js";
import type * as apiAuth from "../apiAuth.js";
import type * as apiKeys from "../apiKeys.js";
import type * as auth from "../auth.js";
import type * as contacts from "../contacts.js";
import type * as deliveryTracking from "../deliveryTracking.js";
import type * as groups from "../groups.js";
import type * as http from "../http.js";
import type * as lessonCsvImport from "../lessonCsvImport.js";
import type * as lessonGroupPrefs from "../lessonGroupPrefs.js";
import type * as lessons from "../lessons.js";
import type * as messageScheduler from "../messageScheduler.js";
import type * as messageTemplates from "../messageTemplates.js";
import type * as predefinedMessages from "../predefinedMessages.js";
import type * as router from "../router.js";
import type * as scheduledMessages from "../scheduledMessages.js";
import type * as setupAdmin from "../setupAdmin.js";
import type * as smsDelivery from "../smsDelivery.js";
import type * as studyBooks from "../studyBooks.js";
import type * as studyGroupPrefs from "../studyGroupPrefs.js";
import type * as testAdminWorkflow from "../testAdminWorkflow.js";
import type * as testData from "../testData.js";
import type * as testUserWorkflow from "../testUserWorkflow.js";
import type * as userCustomMessages from "../userCustomMessages.js";
import type * as userDashboard from "../userDashboard.js";
import type * as userSelectedMessages from "../userSelectedMessages.js";
import type * as userVerification from "../userVerification.js";
import type * as utils_groupColors from "../utils/groupColors.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "_lib/adminAuth": typeof _lib_adminAuth;
  "_lib/messageTypes": typeof _lib_messageTypes;
  "_lib/userAuth": typeof _lib_userAuth;
  adminTest: typeof adminTest;
  allMessagesForStudyBook: typeof allMessagesForStudyBook;
  allScheduledMessages: typeof allScheduledMessages;
  api: typeof api_;
  apiAuth: typeof apiAuth;
  apiKeys: typeof apiKeys;
  auth: typeof auth;
  contacts: typeof contacts;
  deliveryTracking: typeof deliveryTracking;
  groups: typeof groups;
  http: typeof http;
  lessonCsvImport: typeof lessonCsvImport;
  lessonGroupPrefs: typeof lessonGroupPrefs;
  lessons: typeof lessons;
  messageScheduler: typeof messageScheduler;
  messageTemplates: typeof messageTemplates;
  predefinedMessages: typeof predefinedMessages;
  router: typeof router;
  scheduledMessages: typeof scheduledMessages;
  setupAdmin: typeof setupAdmin;
  smsDelivery: typeof smsDelivery;
  studyBooks: typeof studyBooks;
  studyGroupPrefs: typeof studyGroupPrefs;
  testAdminWorkflow: typeof testAdminWorkflow;
  testData: typeof testData;
  testUserWorkflow: typeof testUserWorkflow;
  userCustomMessages: typeof userCustomMessages;
  userDashboard: typeof userDashboard;
  userSelectedMessages: typeof userSelectedMessages;
  userVerification: typeof userVerification;
  "utils/groupColors": typeof utils_groupColors;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
