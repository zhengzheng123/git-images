/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

                                                              
             
                 
             
                     
                            
                                                       

                       
                                                        
  
                                                 

/**
 * Injectable ordering of event plugins.
 */
let eventPluginOrder                   = null;

/**
 * Injectable mapping from names to event plugin modules.
 */
const namesToPlugins                 = {};

/**
 * Recomputes the plugin list using the injected plugins and plugin ordering.
 *
 * @private
 */
function recomputePluginOrdering()       {
  if (!eventPluginOrder) {
    // Wait until an `eventPluginOrder` is injected.
    return;
  }
  for (const pluginName in namesToPlugins) {
    const pluginModule = namesToPlugins[pluginName];
    // $FlowFixMe[incompatible-use] found when upgrading Flow
    const pluginIndex = eventPluginOrder.indexOf(pluginName);

    if (pluginIndex <= -1) {
      throw new Error(
        'EventPluginRegistry: Cannot inject event plugins that do not exist in ' +
          `the plugin ordering, \`${pluginName}\`.`,
      );
    }

    if (plugins[pluginIndex]) {
      continue;
    }

    if (!pluginModule.extractEvents) {
      throw new Error(
        'EventPluginRegistry: Event plugins must implement an `extractEvents` ' +
          `method, but \`${pluginName}\` does not.`,
      );
    }

    plugins[pluginIndex] = pluginModule;
    const publishedEvents = pluginModule.eventTypes;
    for (const eventName in publishedEvents) {
      if (
        !publishEventForPlugin(
          publishedEvents[eventName],
          pluginModule,
          eventName,
        )
      ) {
        throw new Error(
          `EventPluginRegistry: Failed to publish event \`${eventName}\` for plugin \`${pluginName}\`.`,
        );
      }
    }
  }
}

/**
 * Publishes an event so that it can be dispatched by the supplied plugin.
 *
 * @param {object} dispatchConfig Dispatch configuration for the event.
 * @param {object} PluginModule Plugin publishing the event.
 * @return {boolean} True if the event was successfully published.
 * @private
 */
function publishEventForPlugin(
  dispatchConfig                ,
  pluginModule                                    ,
  eventName        ,
)          {
  if (eventNameDispatchConfigs.hasOwnProperty(eventName)) {
    throw new Error(
      'EventPluginRegistry: More than one plugin attempted to publish the same ' +
        `event name, \`${eventName}\`.`,
    );
  }

  eventNameDispatchConfigs[eventName] = dispatchConfig;

  const phasedRegistrationNames = dispatchConfig.phasedRegistrationNames;
  if (phasedRegistrationNames) {
    for (const phaseName in phasedRegistrationNames) {
      if (phasedRegistrationNames.hasOwnProperty(phaseName)) {
        // $FlowFixMe[invalid-computed-prop]
        const phasedRegistrationName = phasedRegistrationNames[phaseName];
        publishRegistrationName(
          phasedRegistrationName,
          pluginModule,
          eventName,
        );
      }
    }
    return true;
  } else if (dispatchConfig.registrationName) {
    publishRegistrationName(
      dispatchConfig.registrationName,
      pluginModule,
      eventName,
    );
    return true;
  }
  return false;
}

/**
 * Publishes a registration name that is used to identify dispatched events.
 *
 * @param {string} registrationName Registration name to add.
 * @param {object} PluginModule Plugin publishing the event.
 * @private
 */
function publishRegistrationName(
  registrationName        ,
  pluginModule                                    ,
  eventName        ,
)       {
  if (registrationNameModules[registrationName]) {
    throw new Error(
      'EventPluginRegistry: More than one plugin attempted to publish the same ' +
        `registration name, \`${registrationName}\`.`,
    );
  }

  registrationNameModules[registrationName] = pluginModule;
  registrationNameDependencies[registrationName] =
    pluginModule.eventTypes[eventName].dependencies;

  if (__DEV__) {
    const lowerCasedName = registrationName.toLowerCase();
    possibleRegistrationNames[lowerCasedName] = registrationName;

    if (registrationName === 'onDoubleClick') {
      possibleRegistrationNames.ondblclick = registrationName;
    }
  }
}

/**
 * Registers plugins so that they can extract and dispatch events.
 */

/**
 * Ordered list of injected plugins.
 */
export const plugins                                            = [];

/**
 * Mapping from event name to dispatch config
 */
export const eventNameDispatchConfigs   
                                      
  = {};

/**
 * Mapping from registration name to plugin module
 */
export const registrationNameModules   
                                                                 
  = {};

/**
 * Mapping from registration name to event name
 */
export const registrationNameDependencies   
                                                         
  = {};

/**
 * Mapping from lowercase registration names to the properly cased version,
 * used to warn in the case of missing event handlers. Available
 * only in __DEV__.
 * @type {Object}
 */
export const possibleRegistrationNames   
                                   
  = __DEV__ ? {} : (null     );
// Trust the developer to only use possibleRegistrationNames in __DEV__

/**
 * Injects an ordering of plugins (by plugin name). This allows the ordering
 * to be decoupled from injection of the actual plugins so that ordering is
 * always deterministic regardless of packaging, on-the-fly injection, etc.
 *
 * @param {array} InjectedEventPluginOrder
 * @internal
 */
export function injectEventPluginOrder(
  injectedEventPluginOrder                  ,
)       {
  if (eventPluginOrder) {
    throw new Error(
      'EventPluginRegistry: Cannot inject event plugin ordering more than ' +
        'once. You are likely trying to load more than one copy of React.',
    );
  }

  // Clone the ordering so it cannot be dynamically mutated.
  // $FlowFixMe[method-unbinding] found when upgrading Flow
  eventPluginOrder = Array.prototype.slice.call(injectedEventPluginOrder);
  recomputePluginOrdering();
}

/**
 * Injects plugins to be used by plugin event system. The plugin names must be
 * in the ordering injected by `injectEventPluginOrder`.
 *
 * Plugins can be injected as part of page initialization or on-the-fly.
 *
 * @param {object} injectedNamesToPlugins Map from names to plugin modules.
 * @internal
 */
export function injectEventPluginsByName(
  injectedNamesToPlugins                ,
)       {
  let isOrderingDirty = false;
  for (const pluginName in injectedNamesToPlugins) {
    if (!injectedNamesToPlugins.hasOwnProperty(pluginName)) {
      continue;
    }
    const pluginModule = injectedNamesToPlugins[pluginName];
    if (
      !namesToPlugins.hasOwnProperty(pluginName) ||
      namesToPlugins[pluginName] !== pluginModule
    ) {
      if (namesToPlugins[pluginName]) {
        throw new Error(
          'EventPluginRegistry: Cannot inject two different event plugins ' +
            `using the same name, \`${pluginName}\`.`,
        );
      }

      namesToPlugins[pluginName] = pluginModule;
      isOrderingDirty = true;
    }
  }
  if (isOrderingDirty) {
    recomputePluginOrdering();
  }
}
