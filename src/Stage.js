import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import PropTypes from "prop-types";
import { AppProvider } from "./AppProvider";
import { getCanvasProps, getDisplayObjectProps, propTypes } from "./stageProps";
import { DEFAULT_PROPS, EVENT_PROPS } from "./props";
import { usePreviousProps, usePixiAppCreator } from "./hooks";
import { ReactPixiFiberAsSecondaryRenderer, applyProps } from "./ReactPixiFiber";
import { createRender, createUnmount } from "./render";
import { createPixiApplication, including } from "./utils";

const render = createRender(ReactPixiFiberAsSecondaryRenderer);
const unmount = createUnmount(ReactPixiFiberAsSecondaryRenderer);

export const includingDisplayObjectProps = including(Object.keys(DEFAULT_PROPS).concat(EVENT_PROPS));
export const includingStageProps = including(Object.keys(propTypes));
export const includingCanvasProps = key => !includingDisplayObjectProps(key) && !includingStageProps(key);

const applyUpdate = (app, props, instance) => {
  const provider = <AppProvider app={app}>{props.children}</AppProvider>;
  const stageProps = getDisplayObjectProps(props);

  applyProps(app.stage, {}, stageProps);

  // a stage class component instance has been passed.
  if (typeof instance === "object") {
    render(provider, app.stage, undefined, instance);
  } else {
    render(provider, app.stage);
  }
};

const getDimensions = props => {
  const { options, width, height } = props;
  const realWidth = (options && options.width) || width;
  const realHeight = (options && options.height) || height;

  return [realWidth, realHeight];
};

const resizeRenderer = (app, prevProps, props) => {
  const [prevWidth, prevHeight] = getDimensions(prevProps);
  const [currentWidth, currentHeight] = getDimensions(props);

  if (currentHeight !== prevHeight || currentWidth !== prevWidth) {
    app.renderer.resize(currentWidth, currentHeight);
  }
};

export function createStageFunction() {
  function Stage(props) {
    const { app, canvas } = usePixiAppCreator(props);
    const prevProps = usePreviousProps(props);

    // Re-render and resize stage on component update
    useLayoutEffect(() => {
      if (!app || !app.stage) return;

      applyUpdate(app, props);
      resizeRenderer(app, prevProps, props);
    });

    return canvas;
  }

  Stage.propTypes = propTypes;

  return Stage;
}

export function createStageClass() {
  class Stage extends React.Component {
    componentDidMount() {
      const { height, options, width, app } = this.props;
      const view = this._canvas;

      this._app = app || createPixiApplication({ height, width, view, ...options });

      // Apply root Container props
      applyUpdate(this._app, this.props, this);
    }

    componentDidUpdate(prevProps) {
      applyUpdate(this._app, this.props, this);
      resizeRenderer(this._app, prevProps, this.props);
    }

    componentWillUnmount() {
      unmount(this._app.stage);
      this._app.destroy();
    }

    render() {
      const { options } = this.props;
      const canvasProps = getCanvasProps(this.props);

      // Do not render anything if view is passed to options
      if (typeof options !== "undefined" && options.view) {
        return null;
      } else {
        return <canvas ref={ref => (this._canvas = ref)} {...canvasProps} />;
      }
    }
  }

  Stage.propTypes = propTypes;

  return Stage;
}

const Stage = typeof useState === "function" ? createStageFunction() : createStageClass();

export default Stage;
