/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { INestApplication } from '@nestjs/common';
import axios from 'axios';
import { bootstrapTestApp } from '../test/test-app';
import { JumioApiService } from './jumio-api.service';

describe('JumioApiService', () => {
  let app: INestApplication;
  let jumioApiService: JumioApiService;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    jumioApiService = app.get(JumioApiService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const axiosMock = () => {
    return jest.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        account: { id: 1 },
        workflowExecution: { id: 1 },
        web: { href: 'http://test.jumio.com/token' },
      },
    });
  };

  const expectedPostArgs = (calledUrl: string) => {
    return [
      calledUrl,
      {
        customerInternalReference: expect.any(Number),
        userReference: expect.any(Number),
        workflowDefinition: {
          key: expect.any(Number),
        },
      },
      {
        headers: expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: expect.stringContaining('Basic '),
          'User-Agent': 'IronFish Website/v1.0',
        }),
      },
    ];
  };

  describe('createAccountAndTransaction', () => {
    describe('when calling jumio', () => {
      it('creates account when jumioAccountId is not present', async () => {
        const postMock = axiosMock();
        await jumioApiService.createAccountAndTransaction(123, null);

        expect(postMock).toHaveBeenCalledWith(
          ...expectedPostArgs(
            'https://account.amer-1.jumio.ai/api/v1/accounts',
          ),
        );
      });

      it('updates existing account when jumioAccountId is present', async () => {
        const postMock = axiosMock();
        await jumioApiService.createAccountAndTransaction(123, 'fooaccount');
        expect(postMock).toHaveBeenCalledWith(
          ...expectedPostArgs(
            'https://account.amer-1.jumio.ai/api/v1/accounts/fooaccount',
          ),
        );
      });
    });
  });
});