import React from "react";

const ButtonComponent = (props) => {
  return (
    <button
      type={props.type || "button"}
      onClick={props.onClick}
      className={props.className}
      style={{
        backgroundColor: props.backgroundColor,
        fontSize: props.fontSize,
        height: props.height,
        borderRadius: props.borderRadius,
        color: props.color,
        margin: props.margin,
        padding: props.padding,
        border: props.border,
        cursor: props.cursor,
        fontFamily: props.fontFamily,
        // transition: props.transition,
      }}
    >
      {props.children}
    </button>
  );
};

export default ButtonComponent;
