/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

             
           
                    
                   
                           
                                           
                                                                              

import {requestTransitionLane} from './ReactFiberRootScheduler';
import {NoLane} from './ReactFiberLane';
import {
  hasScheduledTransitionWork,
  clearAsyncTransitionTimer,
} from './ReactProfilerTimer';
import {
  enableComponentPerformanceTrack,
  enableProfilerTimer,
} from 'shared/ReactFeatureFlags';

// If there are multiple, concurrent async actions, they are entangled. All
// transition updates that occur while the async action is still in progress
// are treated as part of the action.
//
// The ideal behavior would be to treat each async function as an independent
// action. However, without a mechanism like AsyncContext, we can't tell which
// action an update corresponds to. So instead, we entangle them all into one.

// The listeners to notify once the entangled scope completes.
let currentEntangledListeners                            = null;
// The number of pending async actions in the entangled scope.
let currentEntangledPendingCount         = 0;
// The transition lane shared by all updates in the entangled scope.
let currentEntangledLane       = NoLane;
// A thenable that resolves when the entangled scope completes. It does not
// resolve to a particular value because it's only used for suspending the UI
// until the async action scope has completed.
let currentEntangledActionThenable                        = null;

export function entangleAsyncAction   (
  transition                       ,
  thenable             ,
)              {
  // `thenable` is the return value of the async action scope function. Create
  // a combined thenable that resolves once every entangled scope function
  // has finished.
  if (currentEntangledListeners === null) {
    // There's no outer async action scope. Create a new one.
    const entangledListeners = (currentEntangledListeners = []);
    currentEntangledPendingCount = 0;
    currentEntangledLane = requestTransitionLane(transition);
    const entangledThenable                 = {
      status: 'pending',
      value: undefined,
      then(resolve               ) {
        entangledListeners.push(resolve);
      },
    };
    currentEntangledActionThenable = entangledThenable;
  }
  currentEntangledPendingCount++;
  thenable.then(pingEngtangledActionScope, pingEngtangledActionScope);
  return thenable;
}

function pingEngtangledActionScope() {
  if (--currentEntangledPendingCount === 0) {
    if (enableProfilerTimer && enableComponentPerformanceTrack) {
      if (!hasScheduledTransitionWork()) {
        // If we have received no updates since we started the entangled Actions
        // that means it didn't lead to a Transition being rendered. We need to
        // clear the timer so that if we start another entangled sequence we use
        // the next start timer instead of appearing like we were blocked the
        // whole time. We currently don't log a track for Actions that don't
        // render a Transition.
        clearAsyncTransitionTimer();
      }
    }
    if (currentEntangledListeners !== null) {
      // All the actions have finished. Close the entangled async action scope
      // and notify all the listeners.
      if (currentEntangledActionThenable !== null) {
        const fulfilledThenable                          =
          (currentEntangledActionThenable     );
        fulfilledThenable.status = 'fulfilled';
      }
      const listeners = currentEntangledListeners;
      currentEntangledListeners = null;
      currentEntangledLane = NoLane;
      currentEntangledActionThenable = null;
      for (let i = 0; i < listeners.length; i++) {
        const listener = listeners[i];
        listener();
      }
    }
  }
}

export function chainThenableValue   (
  thenable             ,
  result   ,
)              {
  // Equivalent to: Promise.resolve(thenable).then(() => result), except we can
  // cheat a bit since we know that that this thenable is only ever consumed
  // by React.
  //
  // We don't technically require promise support on the client yet, hence this
  // extra code.
  const listeners = [];
  const thenableWithOverride              = {
    status: 'pending',
    value: null,
    reason: null,
    then(resolve            ) {
      listeners.push(resolve);
    },
  };
  thenable.then(
    (value   ) => {
      const fulfilledThenable                       =
        (thenableWithOverride     );
      fulfilledThenable.status = 'fulfilled';
      fulfilledThenable.value = result;
      for (let i = 0; i < listeners.length; i++) {
        const listener = listeners[i];
        listener(result);
      }
    },
    error => {
      const rejectedThenable                      = (thenableWithOverride     );
      rejectedThenable.status = 'rejected';
      rejectedThenable.reason = error;
      for (let i = 0; i < listeners.length; i++) {
        const listener = listeners[i];
        // This is a perf hack where we call the `onFulfill` ping function
        // instead of `onReject`, because we know that React is the only
        // consumer of these promises, and it passes the same listener to both.
        // We also know that it will read the error directly off the
        // `.reason` field.
        listener((undefined     ));
      }
    },
  );
  return thenableWithOverride;
}

export function peekEntangledActionLane()       {
  return currentEntangledLane;
}

export function peekEntangledActionThenable()                        {
  return currentEntangledActionThenable;
}
