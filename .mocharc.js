module.exports = {
  timeout: 2000,
  reporter: "spec",
  recursive: true,
  ignore: [ "test/resources/**" ],
  "node-option": ["experimental-vm-modules", "no-warnings"],
};

