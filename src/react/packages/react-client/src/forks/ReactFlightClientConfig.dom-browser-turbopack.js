/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

export {default as rendererVersion} from 'shared/ReactVersion';
export const rendererPackageName = 'react-server-dom-turbopack';

export * from 'react-client/src/ReactFlightClientStreamConfigWeb';
export * from 'react-client/src/ReactClientConsoleConfigBrowser';
export * from 'react-server-dom-turbopack/src/client/ReactFlightClientConfigBundlerTurbopack';
export * from 'react-server-dom-turbopack/src/client/ReactFlightClientConfigBundlerTurbopackBrowser';
export * from 'react-server-dom-turbopack/src/client/ReactFlightClientConfigTargetTurbopackBrowser';
export * from 'react-dom-bindings/src/shared/ReactFlightClientConfigDOM';
export const usedWithSSR = false;
