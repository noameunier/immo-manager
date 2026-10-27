import { expect, test } from '@playwright/test';

const PASSWORD = 'mot-de-passe-e2e-2026';

/**
 * Parcours complet dans un vrai navigateur : inscription, création du
 * patrimoine, tableau de bord, déconnexion, reconnexion.
 */
test('parcours propriétaire de bout en bout', async ({ page }) => {
  const stamp = Date.now();
  const email = `e2e-${stamp}@example.com`;
  const entityName = `SCI E2E ${stamp}`;

  await test.step('inscription', async () => {
    await page.goto('/inscription');
    await page.getByLabel('Nom complet').fill('Propriétaire E2E');
    await page.getByLabel('Adresse email').fill(email);
    await page.getByLabel(/^Mot de passe/).fill(PASSWORD);
    await page.getByLabel('Confirmer le mot de passe').fill(PASSWORD);
    await page.getByRole('button', { name: 'Créer mon compte' }).click();

    await expect(page).toHaveURL(/\/tableau-de-bord/);
    await expect(page.getByText('Bienvenue dans Immo Manager.')).toBeVisible();
  });

  await test.step('création d’une entité propriétaire', async () => {
    await page.getByRole('link', { name: 'Ajouter une entité' }).click();
    await expect(page).toHaveURL(/\/entites\/nouvelle/);

    await page.getByLabel(/Type d/).selectOption('SCI');
    await page.getByLabel('Nom usuel').fill(entityName);
    await page.getByLabel('Code postal').fill('69002');
    await page.getByLabel('Ville').fill('Lyon');
    await page.getByRole('button', { name: 'Créer l’entité' }).click();

    await expect(page).toHaveURL(/\/entites\/[0-9a-f-]+$/);
    await expect(page.getByRole('heading', { level: 1, name: entityName })).toBeVisible();
    await expect(page.getByText('SCI', { exact: true })).toBeVisible();
  });

  await test.step('création d’un immeuble', async () => {
    await page.getByRole('link', { name: 'Ajouter un immeuble' }).click();
    await expect(page).toHaveURL(/\/immeubles\/nouveau/);

    await page.getByLabel('Nom de l’immeuble').fill('Immeuble E2E');
    await page.getByLabel(/^Adresse( \*)?$/).fill('10 rue du Test');
    await page.getByLabel('Code postal').fill('69002');
    await page.getByLabel('Ville').fill('Lyon');
    await page.getByRole('button', { name: 'Créer l’immeuble' }).click();

    await expect(page).toHaveURL(/\/immeubles\/[0-9a-f-]+$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Immeuble E2E' })).toBeVisible();
  });

  await test.step('création d’un lot', async () => {
    await page.getByRole('link', { name: 'Ajouter un lot' }).click();
    await expect(page).toHaveURL(/\/biens\/nouveau/);

    await page.getByLabel('Nom du bien').fill('Appartement E2E');
    await page.getByLabel('Numéro de lot').fill('E2E-1');
    await page.getByLabel('Surface (m²)').fill('62.5');
    await page.getByLabel('Nombre de pièces').fill('3');
    await page.getByRole('button', { name: 'Créer le bien' }).click();

    await expect(page).toHaveURL(/\/biens\/[0-9a-f-]+$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Appartement E2E' })).toBeVisible();
    await expect(page.getByText('62,5 m²')).toBeVisible();
  });

  await test.step('création d’un locataire', async () => {
    await page.getByRole('link', { name: 'Locataires' }).first().click();
    await expect(page).toHaveURL(/\/locataires$/);

    await page.getByRole('link', { name: 'Ajouter un locataire' }).click();
    await expect(page).toHaveURL(/\/locataires\/nouveau/);

    await page.getByLabel('Nom complet ou raison sociale').fill('Locataire E2E');
    await page.getByLabel('Adresse email').fill(`locataire-${stamp}@example.com`);
    await page.getByRole('button', { name: 'Créer le locataire' }).click();

    await expect(page).toHaveURL(/\/locataires\/[0-9a-f-]+$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Locataire E2E' })).toBeVisible();
  });

  await test.step('création d’un bail', async () => {
    await page.getByRole('link', { name: 'Biens' }).first().click();
    await page.getByRole('link', { name: 'Appartement E2E' }).click();
    await page.getByRole('link', { name: 'Créer un bail' }).click();
    await expect(page).toHaveURL(/\/baux\/nouveau/);

    await page.getByLabel('Locataire').selectOption({ label: 'Locataire E2E' });
    await page.getByLabel('Loyer hors charges (€)').fill('850,50');
    await page.getByLabel('Charges (€)', { exact: true }).fill('50');
    await page.getByRole('button', { name: 'Créer le bail' }).click();

    await expect(page).toHaveURL(/\/baux\/[0-9a-f-]+$/);
    await expect(page.getByText('Actif', { exact: true })).toBeVisible();
    await expect(page.getByText(/900,50/)).toBeVisible();
  });

  await test.step('le bien est marqué occupé', async () => {
    await page.getByRole('link', { name: 'Biens' }).first().click();
    await page.getByRole('link', { name: 'Appartement E2E' }).click();

    await expect(page.getByText('Occupé')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Bail de Locataire E2E' })).toBeVisible();
  });

  await test.step('tableau de bord à jour', async () => {
    await page.getByRole('link', { name: 'Tableau de bord' }).first().click();
    await expect(page).toHaveURL(/\/tableau-de-bord/);

    await expect(page.getByText('Surface totale')).toBeVisible();
    await expect(page.getByText('62,5 m²').first()).toBeVisible();
    await expect(page.getByText('Baux actifs', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Loyer mensuel')).toBeVisible();
  });

  await test.step('déconnexion', async () => {
    await page.getByRole('button', { name: 'Se déconnecter' }).click();
    await expect(page).toHaveURL(/\/connexion/);
  });

  await test.step('mauvais mot de passe refusé', async () => {
    await page.getByLabel('Adresse email').fill(email);
    await page.getByLabel('Mot de passe').fill('mauvais-mot-de-passe');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page.getByText('Email ou mot de passe incorrect.').first()).toBeVisible();
    await expect(page).toHaveURL(/\/connexion/);
  });

  await test.step('reconnexion', async () => {
    await page.getByLabel('Adresse email').fill(email);
    await page.getByLabel('Mot de passe').fill(PASSWORD);
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page).toHaveURL(/\/tableau-de-bord/);
    await expect(page.getByText('62,5 m²').first()).toBeVisible();
  });
});

test('un visiteur ne peut pas accéder au patrimoine', async ({ page }) => {
  await page.goto('/biens');
  await expect(page).toHaveURL(/\/connexion\?suivant=%2Fbiens/);
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
});
