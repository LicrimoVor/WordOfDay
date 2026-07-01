import { FC, memo, useCallback, useEffect, useState } from 'react';
import { Button, Card, Icon, Text, TextInput } from '@gravity-ui/uikit';

import { hasBadWords } from '@/shared/lib/hasBadWords';
import { useGlobalContext } from '@/shared/contex/contex';
import { Data } from '@/shared/const/settings';
import Logo from '@/shared/assets/irgups-logo-vertical.png';
import { TConfig } from '@/shared/types/config';

import { subscribeWord } from '../model/services/subscribeWord';
import { subscribeConfig } from '../model/services/subscribeConfig';
import './FormPage.css';

/** Главная страница */
export const FormPage: FC = memo(() => {
    const [text, setText] = useState('');
    const [isBadWord, setIsBadWord] = useState(false);
    const [data, setData] = useState<Data>({});
    const [config, setConfig] = useState<TConfig>({
        t_updated: 0,
        is_singleton: false,
    });
    const [isPending, setIsPending] = useState(false);
    const { state } = useGlobalContext();

    useEffect(() => {
        if (state.client == undefined) return;
        subscribeConfig(state.client, setConfig);
    }, [state, setConfig]);

    useEffect(() => {
        if (state.client == undefined) return;
        subscribeWord(state.client, setData);
    }, [state, setData]);

    useEffect(() => {
        if (config.is_singleton) {
            const last_time = localStorage.getItem('last_time') || 0;
            if (config.t_updated != last_time) {
                setIsPending(false);
            } else {
                setIsPending(true);
            }
        }
    }, [isPending, setIsPending, config]);

    const onSubmit = useCallback(() => {
        if (state.client == undefined || text == '') return;
        if (hasBadWords(text)) {
            setIsBadWord(true);
        } else {
            if (config.is_singleton) {
                const last_time = localStorage.getItem('last_time') || 0;
                if (config.t_updated == last_time) {
                    return;
                } else {
                    localStorage.setItem('last_time', String(config.t_updated));
                }
            }
            setIsBadWord(false);
            const newData: Data = { ...data };
            const finded = Object.entries(data).some(([key, val]) => {
                if (val.text == text) {
                    newData[key].count += 5;
                    return true;
                }
            });
            if (!finded) {
                let maxKey = 0;
                Object.keys(data).map((key) => {
                    if (Number(key) > maxKey) {
                        maxKey = Number(key);
                    }
                });
                maxKey += 1;
                newData[String(maxKey)] = {
                    text,
                    count: 1,
                };
            }
            setData(newData);
            setIsPending(true);
            state.client.publish('words/data', JSON.stringify(newData), { retain: true });

            if (!config.is_singleton) {
                const timeId = setTimeout(() => setIsPending(false), 5_000);
                return () => clearTimeout(timeId);
            }
        }
    }, [text, data, setIsBadWord, state, setData]);

    return (
        <div className="FormPage">
            <img src={Logo} style={{ width: 62.4 * 2, height: 80 * 2 }} />
            <Card className="FormPageCard">
                <Text variant="header-1">Введи любой тег</Text>
                <TextInput
                    placeholder="ВузКоторымЯГоржусь"
                    onChange={(e) => setText(e.target.value)}
                ></TextInput>
                <Button
                    size="xl"
                    type="submit"
                    onClick={onSubmit}
                    disabled={isPending}
                    className={
                        isPending
                            ? config.is_singleton
                                ? 'is_singleton'
                                : 'progress-bar'
                            : undefined
                    }
                >
                    Отправить
                </Button>
            </Card>
        </div>
    );
});
