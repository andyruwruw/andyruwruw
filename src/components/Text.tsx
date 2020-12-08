import React from 'react';

const sizes = {
  default: 14,
  small: 12,
  title: 18,
};

const colors = {
  default: 'black',
  'grey-lighter': '#999999',
  'gray-light': '#e1e4e8',
  gray: '#586069',
  'gray-dark': '#24292e',
  'standard': 'rgba(125, 125, 125, .8)',
};

const families = {
  default: "-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif,Apple Color Emoji,Segoe UI Emoji",
  mono: "SFMono-Regular,Consolas,Liberation Mono,Menlo,monospace",
};

const weights = {
  default: 400,
  bold: 600,
};

/**
 * Text
 * Simple text line with styles as props.
 * @param weight
 * @param family 
 * @param color
 * @param size 
 */
const Text: React.FC<any> = ({
  children = "",
  weight = "default",
  family = "default",
  color = "default",
  size = "default",
  ...props
}) => {
  return (
    <p
      style={{
        whiteSpace: "pre",
        fontSize: `${sizes[size]}px`,
        lineHeight: 1.5,
        fontFamily: families[family],
        color: colors[color],
        fontWeight: weights[weight],
      }}
      {...props}
    >
      {children}
    </p>
  );
};

export default Text;