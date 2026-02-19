const router = require('express').Router();
const c = require('./../admin/admin.controller');

router.get('/clients', c.listClients);
router.post('/clients', c.createClient);
router.put('/clients/:id', c.updateClient);

router.get('/properties', c.listProperties);
router.post('/properties', c.createProperty);
router.put('/properties/:id', c.updateProperty);

router.post('/properties/:id/fee', c.setPropertyFee);

router.post('/communities/upsert', c.upsertCommunity);

router.post('/communities/:communityId/properties/upsert', c.upsertPropertyInCommunity);

router.post('/properties/:propertyId/owner/register-client', c.upsertClientAssignOwnerAndMatcher);
router.post('/communities/:communityId/properties/upsert-with-fee', c.upsertPropertyInCommunityWithFee);

module.exports = router;