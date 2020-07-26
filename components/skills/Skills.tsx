import React from 'react';

import ReadMeImg from '../ReadMeImg';

import CIcon from '../icons/c';
import CPlusPlusIcon from '../icons/cplusplus';
import CSSIcon from '../icons/css';
import GitIcon from '../icons/git';
import HTMLIcon from '../icons/html';
import JavaIcon from '../icons/java';
import JSIcon from '../icons/js';
import MongoIcon from '../icons/mongo';
import NGINXIcon from '../icons/nginx';
import NodeIcon from '../icons/node';
import PythonIcon from '../icons/python';
import ReactIcon from '../icons/react';
import SassIcon from '../icons/sass';
import TSIcon from '../icons/ts';
import VueIcon from '../icons/vue';

export interface Props {};

/**
 * Skills
 * Displays various SVG icons
 * @param trackLists 
 */
export const Skills: React.FC<Props> = ({}) => {
  return (
    <ReadMeImg
      width="800"
      height="212">
      <style>
        {`
          @import url(\'/components/skills/Skills.css\');
        `}
      </style>

      <div id="icon-wrapper">
        <VueIcon 
          width="70"
          height="70">
        </VueIcon>

        <ReactIcon 
          width="70"
          height="70">
        </ReactIcon>

        <SassIcon 
          width="70"
          height="70">
        </SassIcon>

        <TSIcon 
          width="70"
          height="70">
        </TSIcon>

        <NodeIcon 
          width="70"
          height="70">
        </NodeIcon>

        <MongoIcon 
          width="70"
          height="70">
        </MongoIcon>

        <NGINXIcon 
          width="70"
          height="70">
        </NGINXIcon>

        <PythonIcon 
          width="70"
          height="70">
        </PythonIcon>

        <CPlusPlusIcon 
          width="70"
          height="70">
        </CPlusPlusIcon>

        <JavaIcon 
          width="70"
          height="70">
        </JavaIcon>

        <CIcon 
          width="70"
          height="70">
        </CIcon>

        <GitIcon 
          width="70"
          height="70">
        </GitIcon>

        <HTMLIcon 
          width="70"
          height="70">
        </HTMLIcon>

        <JSIcon 
          width="70"
          height="70">
        </JSIcon>

        <CSSIcon 
          width="70"
          height="70">
        </CSSIcon>
      </div>
    </ReadMeImg>
  );
};