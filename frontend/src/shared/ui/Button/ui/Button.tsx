import {FC } from 'react';

import {Button as UiButton, ButtonProps as UiButtonProps} from '@gravity-ui/uikit';


type ButtonProps = UiButtonProps & {
    fullWidth?: boolean
}

/** Кнопочка */
export const Button: FC<ButtonProps> = (props) => {
    const {
        children,
        className,
        fullWidth=false,
        ...otherProps
    } = props;
    const modes = fullWidth ? 'full_width ' : '';

    return (
        <UiButton
            className={'Button ' +  modes + className}
            {...otherProps}
        >
            {children}
        </UiButton>
    );
};
