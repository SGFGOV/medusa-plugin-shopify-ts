export const JobSchedulerServiceMock = {
  create: jest.fn().mockImplementation((_data) => {
    return Promise.resolve();
  }),
};
